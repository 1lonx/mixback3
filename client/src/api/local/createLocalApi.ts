import { buildChecklist } from '../../lib/checklist';
import {
  ApiError,
  forbidden,
  networkError,
  notFound,
  unauthorized,
  type FieldErrors,
} from '../../lib/errors';
import {
  changePasswordSchema,
  commentSchema,
  deleteAccountSchema,
  engineerSchema,
  inviteSchema,
  loginSchema,
  messageSchema,
  IMAGE_TYPES,
  MAX_COVER_BYTES,
  MAX_PORTFOLIO_TRACKS,
  orderSchema,
  parseWith,
  projectSchema,
  registerSchema,
  reviewSchema,
  trackSchema,
  updateProfileSchema,
  versionSchema,
} from '../../lib/schemas';
import type {
  Checklist,
  Comment,
  EngineerProfile,
  EngineerSummary,
  Message,
  Order,
  OrderAction,
  OrderDetail,
  OrderSide,
  OrderStatus,
  OrderView,
  PortfolioTrack,
  Profile,
  Project,
  ProjectDetail,
  ProjectsQuery,
  ProjectSummary,
  Review,
  Role,
  Session,
  User,
  Version,
} from '../../types/domain';
import type { MixbackApi } from '../types';
import type { z } from 'zod';
import type { BlobStore } from './blobStore';
import { loadDb, saveDb, type Db, type StoredUser } from './db';
import type { MockControls } from './mockControls';
import { hashPassword, randomHex, verifyPassword } from './password';
import { createSeedDb } from './seed';
import type { KeyValueStore } from './storage';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 60_000;
const SAFE_FILE_URL = /^(idb:[A-Za-z0-9_-]+|demo\/[A-Za-z0-9_.-]+)$/;

export interface LocalApiOptions {
  storage: KeyValueStore;
  blobs: BlobStore;
  controls: MockControls;
  assetBase?: string;
  now?: () => Date;
  newId?: (prefix: string) => string;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const toPublicUser = ({ id, email, name }: StoredUser): User => ({ id, email, name });
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const OPEN_ORDER: readonly OrderStatus[] = ['pending', 'in_progress', 'delivered'];

const TRANSITIONS: Record<
  OrderAction,
  { by: OrderSide; from: readonly OrderStatus[]; to: OrderStatus }
> = {
  accept: { by: 'engineer', from: ['pending'], to: 'in_progress' },
  decline: { by: 'engineer', from: ['pending'], to: 'declined' },
  cancel: { by: 'client', from: ['pending', 'in_progress'], to: 'cancelled' },
  deliver: { by: 'engineer', from: ['in_progress'], to: 'delivered' },
  revise: { by: 'client', from: ['delivered'], to: 'in_progress' },
  complete: { by: 'client', from: ['delivered'], to: 'completed' },
};

const round1 = (value: number) => Math.round(value * 10) / 10;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new ApiError(400, 'VALIDATION', 'Не удалось прочитать картинку'));
    reader.readAsDataURL(blob);
  });
}

export function createLocalApi(options: LocalApiOptions): MixbackApi {
  const { storage, blobs, controls, assetBase = '/' } = options;
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? defaultSleep;
  const newId = options.newId ?? ((prefix: string) => `${prefix}_${randomHex(6)}`);

  let seeding: Promise<Db> | null = null;

  async function readDb(): Promise<Db> {
    const existing = loadDb(storage);
    if (existing) return existing;
    seeding ??= createSeedDb(now())
      .then((seed) => {
        saveDb(storage, seed);
        return seed;
      })
      .finally(() => {
        seeding = null;
      });
    return seeding;
  }

  function writeDb(db: Db): void {
    try {
      saveDb(storage, db);
    } catch {
      throw new ApiError(413, 'STORAGE_FULL', 'Не хватает места в хранилище браузера');
    }
  }

  async function network(slowFactor = 1): Promise<void> {
    const { latencyMs, failNetwork } = controls.get();
    await sleep(latencyMs * slowFactor);
    if (failNetwork) throw networkError();
  }

  let queue: Promise<unknown> = Promise.resolve();

  async function request<T>(handler: (db: Db) => T | Promise<T>, slowFactor = 1): Promise<T> {
    await network(slowFactor);
    const run = queue.then(async () => handler(await readDb()));
    queue = run.catch(() => undefined);
    return run;
  }

  function validate<T>(schema: z.ZodType<T>, input: unknown): T {
    const result = parseWith(schema, input);
    if (!result.success) {
      throw new ApiError(400, 'VALIDATION', 'Проверьте заполнение полей', result.errors);
    }
    return result.data;
  }

  function activeSession(db: Db) {
    const session = db.session;
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= now().getTime()) {
      db.session = null;
      writeDb(db);
      return null;
    }
    return session;
  }

  function currentUser(db: Db): StoredUser {
    const session = activeSession(db);
    const user = db.users.find((u) => u.id === session?.userId);
    if (!user) throw unauthorized(session ? undefined : 'Сессия истекла. Войдите снова.');
    return user;
  }

  function assertNotLocked(db: Db, key: string): void {
    const lockedUntil = db.loginAttempts[key]?.lockedUntil;
    if (!lockedUntil) return;
    const left = new Date(lockedUntil).getTime() - now().getTime();
    if (left > 0) {
      throw new ApiError(
        429,
        'TOO_MANY_ATTEMPTS',
        `Слишком много неудачных попыток. Повторите через ${Math.ceil(left / 1000)} с.`,
      );
    }
  }

  function registerFailure(db: Db, key: string): void {
    const previous = db.loginAttempts[key];
    const expired = previous?.lockedUntil && new Date(previous.lockedUntil) <= now();
    const count = (expired ? 0 : (previous?.count ?? 0)) + 1;
    db.loginAttempts[key] =
      count >= MAX_LOGIN_ATTEMPTS
        ? { count: 0, lockedUntil: new Date(now().getTime() + LOCKOUT_MS).toISOString() }
        : { count, lockedUntil: null };
    writeDb(db);
  }

  function clearFailures(db: Db, key: string): void {
    db.loginAttempts = Object.fromEntries(
      Object.entries(db.loginAttempts).filter(([name]) => name !== key),
    );
  }

  async function checkPassword(db: Db, user: StoredUser, password: string, message: string) {
    assertNotLocked(db, user.email);
    if (!(await verifyPassword(password, user.salt, user.passwordHash))) {
      registerFailure(db, user.email);
      throw new ApiError(401, 'BAD_CREDENTIALS', message);
    }
    clearFailures(db, user.email);
  }

  function cascadeDeleteProject(db: Db, projectId: string): Version[] {
    const versions = db.versions.filter((v) => v.projectId === projectId);
    const versionIds = new Set(versions.map((v) => v.id));
    db.projects = db.projects.filter((p) => p.id !== projectId);
    db.members = db.members.filter((m) => m.projectId !== projectId);
    db.versions = db.versions.filter((v) => v.projectId !== projectId);
    db.comments = db.comments.filter((c) => !versionIds.has(c.versionId));
    db.checklists = db.checklists.filter((c) => !versionIds.has(c.versionId));
    return versions;
  }

  const deleteFiles = (versions: Version[]) =>
    Promise.all(
      versions.filter((v) => v.fileUrl.startsWith('idb:')).map((v) => blobs.delete(v.id)),
    );

  function roleIn(db: Db, projectId: string, userId: string): Role {
    const role = db.members.find((m) => m.projectId === projectId && m.userId === userId)?.role;
    if (!role || !db.projects.some((p) => p.id === projectId)) throw notFound('Проект');
    return role;
  }

  function requireOwner(role: Role): void {
    if (role !== 'owner') throw forbidden('Это действие доступно только владельцу проекта');
  }

  function versionContext(db: Db, versionId: string, user: StoredUser) {
    const version = db.versions.find((v) => v.id === versionId);
    if (!version) throw notFound('Версия');
    return { version, role: roleIn(db, version.projectId, user.id) };
  }

  function membersOf(db: Db, projectId: string): ProjectDetail['members'] {
    return db.members
      .filter((m) => m.projectId === projectId)
      .flatMap((m) => {
        const user = db.users.find((u) => u.id === m.userId);
        return user ? [{ userId: user.id, name: user.name, email: user.email, role: m.role }] : [];
      });
  }

  const touch = (project: Project): Project => ({ ...project, updatedAt: now().toISOString() });

  const viewerId = (db: Db): string | null => activeSession(db)?.userId ?? null;
  const nameOf = (db: Db, userId: string) => db.users.find((u) => u.id === userId)?.name ?? '—';

  function summarize(db: Db, profile: EngineerProfile): EngineerSummary | null {
    const user = db.users.find((u) => u.id === profile.userId);
    if (!user) return null;
    const reviews = db.reviews.filter((r) => r.engineerId === profile.userId);
    const prices = profile.services.map((s) => s.priceRub);
    return {
      userId: user.id,
      name: user.name,
      headline: profile.headline,
      genres: profile.genres,
      kinds: [...new Set(profile.services.map((s) => s.kind))],
      minPrice: prices.length ? Math.min(...prices) : null,
      rating: reviews.length
        ? round1(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
        : null,
      reviewsCount: reviews.length,
      completedOrders: db.orders.filter((o) => o.engineerId === user.id && o.status === 'completed')
        .length,
      coverUrl: profile.coverUrl ?? null,
    };
  }

  const orderView = (db: Db, order: Order, userId: string): OrderView => ({
    ...order,
    projectId: db.projects.some((p) => p.id === order.projectId) ? order.projectId : null,
    engineerName: nameOf(db, order.engineerId),
    clientName: nameOf(db, order.clientId),
    side: order.clientId === userId ? 'client' : 'engineer',
  });

  function orderOf(db: Db, id: string, user: StoredUser): Order {
    const order = db.orders.find((o) => o.id === id);
    if (!order || (order.clientId !== user.id && order.engineerId !== user.id)) {
      throw notFound('Заказ');
    }
    return order;
  }

  const orderDetail = (db: Db, order: Order, userId: string): OrderDetail => ({
    ...orderView(db, order, userId),
    review: db.reviews.find((r) => r.orderId === order.id) ?? null,
  });

  function openSession(db: Db, user: StoredUser): Session {
    const token = randomHex(24);
    const createdAt = now();
    db.session = {
      userId: user.id,
      token,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + SESSION_TTL_MS).toISOString(),
    };
    writeDb(db);
    return { user: toPublicUser(user), token };
  }

  return {
    auth: {
      register: (input) =>
        request(async (db) => {
          const data = validate(registerSchema, input);
          const email = normalizeEmail(data.email);
          if (db.users.some((u) => u.email === email)) {
            throw new ApiError(409, 'EMAIL_TAKEN', 'Этот e-mail уже зарегистрирован', {
              email: 'Этот e-mail уже зарегистрирован — войдите в аккаунт',
            });
          }
          const salt = randomHex(8);
          const user: StoredUser = {
            id: newId('u'),
            email,
            name: data.name,
            salt,
            passwordHash: await hashPassword(data.password, salt),
            createdAt: now().toISOString(),
          };
          db.users.push(user);
          return openSession(db, user);
        }),

      login: (input) =>
        request(async (db) => {
          const data = validate(loginSchema, input);
          const user = db.users.find((u) => u.email === normalizeEmail(data.email));
          const badCredentials = () =>
            new ApiError(401, 'BAD_CREDENTIALS', 'Неверный e-mail или пароль');
          const key = normalizeEmail(data.email);
          assertNotLocked(db, key);
          if (!user) {
            registerFailure(db, key);
            throw badCredentials();
          }
          if (!(await verifyPassword(data.password, user.salt, user.passwordHash))) {
            registerFailure(db, key);
            throw badCredentials();
          }
          clearFailures(db, key);
          return openSession(db, user);
        }),

      logout: () =>
        request((db) => {
          db.session = null;
          writeDb(db);
        }),

      me: () =>
        request((db) => {
          const session = activeSession(db);
          const user = db.users.find((u) => u.id === session?.userId);
          return user ? toPublicUser(user) : null;
        }),

      profile: () =>
        request((db): Profile => {
          const user = currentUser(db);
          const session = activeSession(db);
          const memberships = db.members.filter((m) => m.userId === user.id);
          const ownedIds = new Set(
            memberships.filter((m) => m.role === 'owner').map((m) => m.projectId),
          );
          const mine = db.comments.filter((c) => c.authorId === user.id);
          return {
            user: toPublicUser(user),
            createdAt: user.createdAt,
            stats: {
              projectsOwned: ownedIds.size,
              projectsShared: memberships.length - ownedIds.size,
              versions: db.versions.filter((v) => ownedIds.has(v.projectId)).length,
              comments: mine.length,
              resolved: mine.filter((c) => c.resolved).length,
            },
            session: {
              createdAt: session?.createdAt ?? user.createdAt,
              expiresAt: session?.expiresAt ?? user.createdAt,
            },
          };
        }),

      updateProfile: (input) =>
        request((db) => {
          const user = currentUser(db);
          const data = validate(updateProfileSchema, input);
          user.name = data.name;
          for (const comment of db.comments) {
            if (comment.authorId === user.id) comment.authorName = data.name;
          }
          for (const review of db.reviews) {
            if (review.authorId === user.id) review.authorName = data.name;
          }
          for (const message of db.messages) {
            if (message.authorId === user.id) message.authorName = data.name;
          }
          writeDb(db);
          return toPublicUser(user);
        }),

      changePassword: (input) =>
        request(async (db) => {
          const user = currentUser(db);
          const data = validate(changePasswordSchema, {
            ...input,
            confirmPassword: input.newPassword,
          });
          await checkPassword(db, user, data.currentPassword, 'Текущий пароль указан неверно');
          user.salt = randomHex(8);
          user.passwordHash = await hashPassword(data.newPassword, user.salt);
          return openSession(db, user);
        }),

      deleteAccount: (input) =>
        request(async (db) => {
          const user = currentUser(db);
          const data = validate(deleteAccountSchema, input);
          await checkPassword(db, user, data.password, 'Пароль указан неверно');

          const ownedIds = db.members
            .filter((m) => m.userId === user.id && m.role === 'owner')
            .map((m) => m.projectId);
          const versions = ownedIds.flatMap((id) => cascadeDeleteProject(db, id));
          db.members = db.members.filter((m) => m.userId !== user.id);
          db.comments = db.comments.filter((c) => c.authorId !== user.id);

          const tracks = db.portfolio.filter((t) => t.engineerId === user.id);
          db.engineers = db.engineers.filter((e) => e.userId !== user.id);
          db.portfolio = db.portfolio.filter((t) => t.engineerId !== user.id);
          const goneOrders = new Set(
            db.orders
              .filter((o) => o.clientId === user.id || o.engineerId === user.id)
              .map((o) => o.id),
          );
          db.orders = db.orders.filter((o) => !goneOrders.has(o.id));
          db.messages = db.messages.filter((m) => !goneOrders.has(m.orderId));
          db.reviews = db.reviews.filter((r) => r.authorId !== user.id && r.engineerId !== user.id);

          db.users = db.users.filter((u) => u.id !== user.id);
          db.session = null;
          writeDb(db);
          await deleteFiles(versions);
          await Promise.all(
            tracks.filter((t) => t.fileUrl.startsWith('idb:')).map((t) => blobs.delete(t.id)),
          );
        }),
    },

    projects: {
      list: (query: ProjectsQuery) =>
        request((db) => {
          const user = currentUser(db);
          const q = query.q.trim().toLowerCase();

          const summaries = db.members
            .filter((m) => m.userId === user.id)
            .flatMap((m): ProjectSummary[] => {
              const project = db.projects.find((p) => p.id === m.projectId);
              if (!project) return [];
              const versionIds = db.versions
                .filter((v) => v.projectId === project.id)
                .map((v) => v.id);
              return [
                {
                  ...project,
                  role: m.role,
                  versionsCount: versionIds.length,
                  openComments: db.comments.filter(
                    (c) => versionIds.includes(c.versionId) && !c.resolved,
                  ).length,
                },
              ];
            })
            .filter((p) => query.status === 'all' || p.status === query.status)
            .filter(
              (p) => !q || p.title.toLowerCase().includes(q) || p.artist.toLowerCase().includes(q),
            );

          const sorters: Record<
            ProjectsQuery['sort'],
            (a: ProjectSummary, b: ProjectSummary) => number
          > = {
            updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
            title: (a, b) => a.title.localeCompare(b.title, 'ru'),
            comments: (a, b) => b.openComments - a.openComments,
          };
          return summaries.sort(sorters[query.sort]);
        }),

      get: (id) =>
        request((db) => {
          const user = currentUser(db);
          const role = roleIn(db, id, user.id);
          const project = db.projects.find((p) => p.id === id);
          if (!project) throw notFound('Проект');
          return {
            project,
            role,
            members: membersOf(db, id),
            versions: db.versions
              .filter((v) => v.projectId === id)
              .sort((a, b) => a.number - b.number),
          };
        }),

      create: (input) =>
        request((db) => {
          const user = currentUser(db);
          const data = validate(projectSchema, { ...input, status: 'active' });
          const stamp = now().toISOString();
          const project: Project = {
            id: newId('p'),
            ...data,
            ownerId: user.id,
            createdAt: stamp,
            updatedAt: stamp,
          };
          db.projects.push(project);
          db.members.push({ projectId: project.id, userId: user.id, role: 'owner' });
          writeDb(db);
          return project;
        }),

      update: (id, patch) =>
        request((db) => {
          const user = currentUser(db);
          requireOwner(roleIn(db, id, user.id));
          const index = db.projects.findIndex((p) => p.id === id);
          const current = db.projects[index];
          if (!current) throw notFound('Проект');
          const data = validate(projectSchema.partial(), patch);
          const updated = touch({ ...current, ...data });
          db.projects[index] = updated;
          writeDb(db);
          return updated;
        }),

      remove: (id) =>
        request(async (db) => {
          const user = currentUser(db);
          requireOwner(roleIn(db, id, user.id));
          const versions = cascadeDeleteProject(db, id);
          writeDb(db);
          await deleteFiles(versions);
        }),

      invite: (id, email) =>
        request((db) => {
          const user = currentUser(db);
          requireOwner(roleIn(db, id, user.id));
          const data = validate(inviteSchema, { email });
          const invited = db.users.find((u) => u.email === normalizeEmail(data.email));
          const fieldErrors = (message: string): FieldErrors => ({ email: message });
          if (!invited) {
            throw new ApiError(
              404,
              'USER_NOT_FOUND',
              'Пользователь не найден',
              fieldErrors('Пользователь с таким e-mail ещё не зарегистрирован в Mixback'),
            );
          }
          if (db.members.some((m) => m.projectId === id && m.userId === invited.id)) {
            throw new ApiError(
              409,
              'ALREADY_MEMBER',
              'Уже участник',
              fieldErrors('Этот пользователь уже участвует в проекте'),
            );
          }
          db.members.push({ projectId: id, userId: invited.id, role: 'artist' });
          writeDb(db);
          return membersOf(db, id);
        }),
    },

    versions: {
      create: (projectId, input) =>
        request(async (db) => {
          const user = currentUser(db);
          requireOwner(roleIn(db, projectId, user.id));
          const { note } = validate(versionSchema, { note: input.note });
          const id = newId('v');
          try {
            await blobs.put(id, input.file);
          } catch {
            throw new ApiError(
              413,
              'STORAGE_FULL',
              'Не удалось сохранить файл: не хватает места в браузере',
            );
          }
          const number =
            Math.max(
              0,
              ...db.versions.filter((v) => v.projectId === projectId).map((v) => v.number),
            ) + 1;
          const version: Version = {
            id,
            projectId,
            number,
            note: note || input.fileName,
            fileUrl: `idb:${id}`,
            durationSec: input.analysis.durationSec,
            peaks: input.analysis.peaks,
            lufs: input.analysis.lufs,
            peakDb: input.analysis.peakDb,
            createdAt: now().toISOString(),
          };
          db.versions.push(version);
          const index = db.projects.findIndex((p) => p.id === projectId);
          const project = db.projects[index];
          if (project) db.projects[index] = touch(project);
          writeDb(db);
          return version;
        }, 2),

      audioUrl: async (file) => {
        if (!SAFE_FILE_URL.test(file.fileUrl)) {
          throw new ApiError(400, 'UNSAFE_URL', 'Недопустимый адрес аудиофайла');
        }
        if (!file.fileUrl.startsWith('idb:')) {
          return `${assetBase}${file.fileUrl}`.replace(/(?<!:)\/{2,}/g, '/');
        }
        const blob = await blobs.get(file.id);
        if (!blob) throw notFound('Аудиофайл');
        return URL.createObjectURL(blob);
      },
    },

    comments: {
      list: (versionId) =>
        request((db) => {
          const user = currentUser(db);
          versionContext(db, versionId, user);
          return db.comments
            .filter((c) => c.versionId === versionId)
            .sort((a, b) => a.timeSec - b.timeSec);
        }),

      create: (versionId, input) =>
        request((db) => {
          const user = currentUser(db);
          const { version } = versionContext(db, versionId, user);
          const data = validate(commentSchema, input);
          if (data.timeSec > version.durationSec + 1) {
            throw new ApiError(400, 'VALIDATION', 'Проверьте заполнение полей', {
              timeSec: 'Время больше длины трека',
            });
          }
          const comment: Comment = {
            id: newId('c'),
            versionId,
            authorId: user.id,
            authorName: user.name,
            timeSec: data.timeSec,
            text: data.text,
            resolved: false,
            createdAt: now().toISOString(),
          };
          db.comments.push(comment);
          writeDb(db);
          return comment;
        }),

      update: (id, patch) =>
        request((db) => {
          const user = currentUser(db);
          const index = db.comments.findIndex((c) => c.id === id);
          const current = db.comments[index];
          if (!current) throw notFound('Комментарий');
          const { role } = versionContext(db, current.versionId, user);
          const isAuthor = current.authorId === user.id;

          if (patch.text !== undefined && !isAuthor)
            throw forbidden('Редактировать можно только свой комментарий');
          if (patch.resolved !== undefined && !isAuthor && role !== 'owner') {
            throw forbidden(
              'Отметить правку выполненной может автор комментария или владелец проекта',
            );
          }
          const text =
            patch.text === undefined
              ? current.text
              : validate(commentSchema.pick({ text: true }), { text: patch.text }).text;

          const updated: Comment = {
            ...current,
            text,
            resolved: patch.resolved ?? current.resolved,
          };
          db.comments[index] = updated;
          writeDb(db);
          return updated;
        }),

      remove: (id) =>
        request((db) => {
          const user = currentUser(db);
          const current = db.comments.find((c) => c.id === id);
          if (!current) throw notFound('Комментарий');
          const { role } = versionContext(db, current.versionId, user);
          if (current.authorId !== user.id && role !== 'owner') {
            throw forbidden('Удалить можно только свой комментарий');
          }
          db.comments = db.comments.filter((c) => c.id !== id);
          writeDb(db);
        }),
    },

    checklist: {
      get: (versionId) =>
        request((db) => {
          const user = currentUser(db);
          versionContext(db, versionId, user);
          return db.checklists.find((c) => c.versionId === versionId) ?? null;
        }),

      generate: (versionId) =>
        request((db) => {
          const user = currentUser(db);
          requireOwner(versionContext(db, versionId, user).role);
          const previous = db.checklists.find((c) => c.versionId === versionId);
          const doneIds = new Set(previous?.items.filter((i) => i.done).map((i) => i.id));
          const items = buildChecklist(db.comments.filter((c) => c.versionId === versionId)).map(
            (item) => ({ ...item, done: doneIds.has(item.id) }),
          );
          const checklist: Checklist = { versionId, generatedAt: now().toISOString(), items };
          db.checklists = [...db.checklists.filter((c) => c.versionId !== versionId), checklist];
          writeDb(db);
          return checklist;
        }, 3),

      toggle: (versionId, itemId, done) =>
        request((db) => {
          const user = currentUser(db);
          requireOwner(versionContext(db, versionId, user).role);
          const checklist = db.checklists.find((c) => c.versionId === versionId);
          const item = checklist?.items.find((i) => i.id === itemId);
          if (!checklist || !item) throw notFound('Пункт чек-листа');
          item.done = done;
          writeDb(db);
          return checklist;
        }),
    },

    engineers: {
      list: (query) =>
        request((db) => {
          const q = query.q.trim().toLowerCase();
          const found = db.engineers
            .filter((e) => e.published)
            .flatMap((e) => {
              const summary = summarize(db, e);
              return summary ? [{ e, summary }] : [];
            })
            .filter(({ e, summary }) => {
              if (query.kind !== 'all' && !summary.kinds.includes(query.kind)) return false;
              if (query.genre !== 'all' && !e.genres.includes(query.genre)) return false;
              if (query.maxPrice !== null) {
                if (summary.minPrice === null || summary.minPrice > query.maxPrice) return false;
              }
              if (!q) return true;
              const haystack = [
                summary.name,
                e.headline,
                ...e.genres,
                ...e.services.map((s) => s.title),
              ];
              return haystack.some((text) => text.toLowerCase().includes(q));
            })
            .map(({ summary }) => summary);

          const byRating = (a: EngineerSummary, b: EngineerSummary) =>
            (b.rating ?? 0) - (a.rating ?? 0) || b.reviewsCount - a.reviewsCount;
          const sorters: Record<
            typeof query.sort,
            (a: EngineerSummary, b: EngineerSummary) => number
          > = {
            rating: byRating,
            price: (a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity) || byRating(a, b),
            orders: (a, b) => b.completedOrders - a.completedOrders || byRating(a, b),
          };
          return found.sort(sorters[query.sort]);
        }),

      get: (userId) =>
        request((db) => {
          const viewer = viewerId(db);
          const profile = db.engineers.find((e) => e.userId === userId);
          if (!profile || (!profile.published && viewer !== userId)) {
            throw notFound('Звукорежиссёр');
          }
          const summary = summarize(db, profile);
          if (!summary) throw notFound('Звукорежиссёр');
          return {
            ...summary,
            bio: profile.bio,
            services: profile.services,
            portfolio: db.portfolio
              .filter((t) => t.engineerId === userId)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
            reviews: db.reviews
              .filter((r) => r.engineerId === userId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            published: profile.published,
            isMe: viewer === userId,
          };
        }),

      mine: () =>
        request((db) => {
          const user = currentUser(db);
          const profile = db.engineers.find((e) => e.userId === user.id);
          if (!profile) return null;
          return { profile, portfolio: db.portfolio.filter((t) => t.engineerId === user.id) };
        }),

      save: (input) =>
        request((db) => {
          const user = currentUser(db);
          const data = validate(engineerSchema, input);
          const previous = db.engineers.find((e) => e.userId === user.id);
          const known = new Set(previous?.services.map((s) => s.id));
          const profile: EngineerProfile = {
            userId: user.id,
            headline: data.headline,
            bio: data.bio,
            genres: data.genres,
            published: data.published,
            coverUrl: previous?.coverUrl ?? null,
            services: data.services.map(({ id, ...service }) => ({
              ...service,
              id: id && known.has(id) ? id : newId('s'),
            })),
            updatedAt: now().toISOString(),
          };
          db.engineers = [...db.engineers.filter((e) => e.userId !== user.id), profile];
          writeDb(db);
          return profile;
        }),

      count: () => request((db) => db.engineers.filter((e) => e.published).length),

      setCover: (image) =>
        request(async (db) => {
          const user = currentUser(db);
          const profile = db.engineers.find((e) => e.userId === user.id);
          if (!profile) {
            throw new ApiError(409, 'NO_PROFILE', 'Сначала сохраните анкету звукорежиссёра');
          }
          if (image) {
            if (!(IMAGE_TYPES as readonly string[]).includes(image.type)) {
              throw new ApiError(400, 'VALIDATION', 'Нужна картинка JPEG, PNG или WebP');
            }
            if (image.size > MAX_COVER_BYTES) {
              throw new ApiError(
                413,
                'IMAGE_TOO_LARGE',
                'Картинка слишком тяжёлая даже после сжатия',
              );
            }
          }
          profile.coverUrl = image ? await readAsDataUrl(image) : null;
          writeDb(db);
          return profile;
        }, 2),

      addTrack: (input) =>
        request(async (db) => {
          const user = currentUser(db);
          if (!db.engineers.some((e) => e.userId === user.id)) {
            throw new ApiError(409, 'NO_PROFILE', 'Сначала сохраните анкету звукорежиссёра');
          }
          const data = validate(trackSchema, input);
          if (db.portfolio.filter((t) => t.engineerId === user.id).length >= MAX_PORTFOLIO_TRACKS) {
            throw new ApiError(
              409,
              'PORTFOLIO_FULL',
              `В портфолио может быть не больше ${MAX_PORTFOLIO_TRACKS} работ`,
            );
          }
          const id = newId('t');
          try {
            await blobs.put(id, input.file);
          } catch {
            throw new ApiError(
              413,
              'STORAGE_FULL',
              'Не удалось сохранить файл: не хватает места в браузере',
            );
          }
          const track: PortfolioTrack = {
            id,
            engineerId: user.id,
            title: data.title,
            genre: data.genre,
            description: data.description,
            fileUrl: `idb:${id}`,
            durationSec: input.analysis.durationSec,
            peaks: input.analysis.peaks,
            createdAt: now().toISOString(),
          };
          db.portfolio.push(track);
          writeDb(db);
          return track;
        }, 2),

      removeTrack: (id) =>
        request(async (db) => {
          const user = currentUser(db);
          const track = db.portfolio.find((t) => t.id === id);
          if (!track) throw notFound('Работа');
          if (track.engineerId !== user.id) throw forbidden('Это не ваша работа');
          db.portfolio = db.portfolio.filter((t) => t.id !== id);
          writeDb(db);
          if (track.fileUrl.startsWith('idb:')) await blobs.delete(track.id);
        }),
    },

    orders: {
      list: (query) =>
        request((db) => {
          const user = currentUser(db);
          return db.orders
            .filter((o) => (query.side === 'client' ? o.clientId : o.engineerId) === user.id)
            .filter((o) => query.status === 'all' || o.status === query.status)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((o) => orderView(db, o, user.id));
        }),

      get: (id) =>
        request((db) => {
          const user = currentUser(db);
          return orderDetail(db, orderOf(db, id, user), user.id);
        }),

      create: (input) =>
        request((db) => {
          const user = currentUser(db);
          const data = validate(orderSchema, input);
          const profile = db.engineers.find((e) => e.userId === data.engineerId && e.published);
          if (!profile) throw notFound('Звукорежиссёр');
          if (profile.userId === user.id) {
            throw new ApiError(400, 'SELF_ORDER', 'Нельзя заказать услугу у самого себя');
          }
          const service = profile.services.find((s) => s.id === data.serviceId);
          if (!service) {
            throw new ApiError(400, 'VALIDATION', 'Проверьте заполнение полей', {
              serviceId: 'Такой услуги у звукорежиссёра нет',
            });
          }
          const duplicate = db.orders.some(
            (o) =>
              o.clientId === user.id && o.serviceId === service.id && OPEN_ORDER.includes(o.status),
          );
          if (duplicate) {
            throw new ApiError(
              409,
              'DUPLICATE_ORDER',
              'Этот заказ уже оформлен и ещё не завершён. Откройте его в разделе «Заказы».',
            );
          }
          const stamp = now().toISOString();
          const order: Order = {
            id: newId('o'),
            engineerId: profile.userId,
            clientId: user.id,
            serviceId: service.id,
            serviceTitle: service.title,
            serviceKind: service.kind,
            priceRub: service.priceRub,
            days: service.days,
            brief: data.brief,
            status: 'pending',
            projectId: null,
            reviewed: false,
            createdAt: stamp,
            updatedAt: stamp,
          };
          db.orders.push(order);
          writeDb(db);
          return order;
        }),

      act: (id, action) =>
        request((db) => {
          const user = currentUser(db);
          const order = orderOf(db, id, user);
          const rule = TRANSITIONS[action];
          const side: OrderSide = order.clientId === user.id ? 'client' : 'engineer';
          if (side !== rule.by) {
            throw forbidden(
              rule.by === 'engineer'
                ? 'Это действие доступно только звукорежиссёру'
                : 'Это действие доступно только заказчику',
            );
          }
          if (!rule.from.includes(order.status)) {
            throw new ApiError(
              409,
              'INVALID_TRANSITION',
              'Статус заказа уже изменился. Обновите страницу.',
            );
          }

          const stamp = now().toISOString();
          const project = db.projects.find((p) => p.id === order.projectId);
          const setProjectStatus = (status: Project['status']) => {
            if (!project) return;
            db.projects[db.projects.indexOf(project)] = { ...touch(project), status };
          };

          if (action === 'accept') {
            const client = nameOf(db, order.clientId);
            const created: Project = {
              id: newId('p'),
              title: `${order.serviceTitle} — ${client}`.slice(0, 80),
              artist: client.slice(0, 60),
              description: order.brief.slice(0, 500),
              status: 'active',
              ownerId: order.engineerId,
              createdAt: stamp,
              updatedAt: stamp,
            };
            db.projects.push(created);
            db.members.push(
              { projectId: created.id, userId: order.engineerId, role: 'owner' },
              { projectId: created.id, userId: order.clientId, role: 'artist' },
            );
            order.projectId = created.id;
          }
          if (action === 'deliver' && !db.versions.some((v) => v.projectId === order.projectId)) {
            throw new ApiError(
              409,
              'NO_VERSION',
              'Сначала загрузите в проект хотя бы одну версию микса',
            );
          }
          if (action === 'cancel') setProjectStatus('archived');
          if (action === 'complete') setProjectStatus('approved');
          if (action === 'revise') setProjectStatus('active');

          order.status = rule.to;
          order.updatedAt = stamp;
          writeDb(db);
          return orderDetail(db, order, user.id);
        }),

      review: (id, input) =>
        request((db): Review => {
          const user = currentUser(db);
          const order = orderOf(db, id, user);
          if (order.clientId !== user.id) throw forbidden('Отзыв оставляет заказчик');
          if (order.status !== 'completed') {
            throw new ApiError(
              409,
              'NOT_COMPLETED',
              'Отзыв можно оставить после завершения заказа',
            );
          }
          if (order.reviewed) {
            throw new ApiError(409, 'ALREADY_REVIEWED', 'Вы уже оставили отзыв на этот заказ');
          }
          const data = validate(reviewSchema, input);
          const review: Review = {
            id: newId('r'),
            engineerId: order.engineerId,
            orderId: order.id,
            authorId: user.id,
            authorName: user.name,
            rating: data.rating,
            text: data.text,
            createdAt: now().toISOString(),
          };
          db.reviews.push(review);
          order.reviewed = true;
          writeDb(db);
          return review;
        }),
    },

    messages: {
      list: (orderId) =>
        request((db) => {
          const user = currentUser(db);
          orderOf(db, orderId, user);
          return db.messages
            .filter((m) => m.orderId === orderId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        }),

      send: (orderId, input) =>
        request((db): Message => {
          const user = currentUser(db);
          const order = orderOf(db, orderId, user);
          if (order.status === 'declined' || order.status === 'cancelled') {
            throw new ApiError(409, 'ORDER_CLOSED', 'Заказ закрыт — писать в нём больше нельзя');
          }
          const data = validate(messageSchema, input);
          const message: Message = {
            id: newId('m'),
            orderId,
            authorId: user.id,
            authorName: user.name,
            text: data.text,
            createdAt: now().toISOString(),
          };
          db.messages.push(message);
          writeDb(db);
          return message;
        }),
    },
  };
}
