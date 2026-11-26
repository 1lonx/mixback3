import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/errors';
import { DEMO_ARTIST, DEMO_OWNER, DEMO_PASSWORD } from '../../lib/demoAccounts';
import type { ProjectsQuery } from '../../types/domain';
import type { MixbackApi } from '../types';
import { createTestApi } from '../../test/utils';
import { DB_KEY } from './db';

const ALL: ProjectsQuery = { q: '', status: 'all', sort: 'updated' };

async function expectApiError(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, ...(code ? { code } : {}) });
  return error as ApiError;
}

describe('createLocalApi', () => {
  let ctx: ReturnType<typeof createTestApi>;
  let api: MixbackApi;

  const loginOwner = () => api.auth.login({ email: DEMO_OWNER.email, password: DEMO_PASSWORD });
  const loginArtist = () => api.auth.login({ email: DEMO_ARTIST.email, password: DEMO_PASSWORD });

  beforeEach(() => {
    ctx = createTestApi();
    api = ctx.api;
  });

  describe('авторизация', () => {
    it('первый запрос создаёт демо-данные', async () => {
      expect(await api.auth.me()).toBeNull();
      expect(ctx.storage.getItem(DB_KEY)).not.toBeNull();
    });

    it('вход с верным паролем открывает сессию и возвращает пользователя без хеша', async () => {
      const session = await loginOwner();
      expect(session.user).toEqual({
        id: DEMO_OWNER.id,
        email: DEMO_OWNER.email,
        name: DEMO_OWNER.name,
      });
      expect(session.token).toHaveLength(48);
      expect(await api.auth.me()).toEqual(session.user);
    });

    it('e-mail не чувствителен к регистру и пробелам', async () => {
      const session = await api.auth.login({
        email: '  DEMO@mixback.APP ',
        password: DEMO_PASSWORD,
      });
      expect(session.user.id).toBe(DEMO_OWNER.id);
    });

    it('неверный пароль и несуществующий e-mail дают одинаковую ошибку 401', async () => {
      const wrongPassword = await expectApiError(
        api.auth.login({ email: DEMO_OWNER.email, password: 'wrong-pass1' }),
        401,
        'BAD_CREDENTIALS',
      );
      const noUser = await expectApiError(
        api.auth.login({ email: 'nobody@mail.ru', password: 'wrong-pass1' }),
        401,
        'BAD_CREDENTIALS',
      );
      expect(wrongPassword.message).toBe(noUser.message);
    });

    it('вход с пустыми полями — 400 с ошибками по полям', async () => {
      const error = await expectApiError(
        api.auth.login({ email: '', password: '' }),
        400,
        'VALIDATION',
      );
      expect(error.fieldErrors).toMatchObject({
        email: 'Укажите e-mail',
        password: 'Введите пароль',
      });
    });

    it('регистрация создаёт пользователя и сразу входит', async () => {
      const session = await api.auth.register({
        name: 'Новичок',
        email: 'New@Mail.ru',
        password: 'secret123',
      });
      expect(session.user).toMatchObject({ name: 'Новичок', email: 'new@mail.ru' });
      expect(await api.auth.me()).toEqual(session.user);
    });

    it('регистрация с занятым e-mail — 409', async () => {
      const error = await expectApiError(
        api.auth.register({ name: 'Двойник', email: DEMO_OWNER.email, password: 'secret123' }),
        409,
        'EMAIL_TAKEN',
      );
      expect(error.fieldErrors).toHaveProperty('email');
    });

    it('регистрация со слабым паролем — 400', async () => {
      await expectApiError(
        api.auth.register({ name: 'Имя', email: 'a@b.ru', password: '123' }),
        400,
      );
    });

    it('пароль не хранится открытым текстом', async () => {
      await api.auth.register({ name: 'Новичок', email: 'new@mail.ru', password: 'secret123' });
      expect(ctx.storage.getItem(DB_KEY)).not.toContain('secret123');
    });

    it('выход закрывает сессию', async () => {
      await loginOwner();
      await api.auth.logout();
      expect(await api.auth.me()).toBeNull();
      await expectApiError(api.projects.list(ALL), 401);
    });
  });

  describe('проекты: CRUD', () => {
    beforeEach(async () => {
      await loginOwner();
    });

    it('без входа все методы отвечают 401', async () => {
      await api.auth.logout();
      await expectApiError(api.projects.list(ALL), 401, 'UNAUTHORIZED');
      await expectApiError(api.projects.get('p_night'), 401);
      await expectApiError(api.projects.create({ title: 'Ab', artist: 'X', description: '' }), 401);
    });

    it('list возвращает проекты пользователя с агрегатами', async () => {
      const list = await api.projects.list(ALL);
      expect(list.map((p) => p.id).sort()).toEqual(['p_night', 'p_old', 'p_summer']);
      const night = list.find((p) => p.id === 'p_night');
      expect(night).toMatchObject({ role: 'owner', versionsCount: 3, openComments: 6 });
    });

    it('list фильтрует по тексту (название и артист, без учёта регистра)', async () => {
      expect((await api.projects.list({ ...ALL, q: 'НОЧНОЙ' })).map((p) => p.id)).toEqual([
        'p_night',
      ]);
      expect((await api.projects.list({ ...ALL, q: 'мартин' })).map((p) => p.id)).toEqual([
        'p_old',
      ]);
      expect(await api.projects.list({ ...ALL, q: 'нет такого' })).toEqual([]);
    });

    it('list фильтрует по статусу', async () => {
      const approved = await api.projects.list({ ...ALL, status: 'approved' });
      expect(approved.map((p) => p.id)).toEqual(['p_old']);
    });

    it('list сортирует по названию и по числу открытых правок', async () => {
      const byTitle = await api.projects.list({ ...ALL, sort: 'title' });
      expect(byTitle.map((p) => p.title)).toEqual(
        [...byTitle.map((p) => p.title)].sort((a, b) => a.localeCompare(b, 'ru')),
      );
      const byComments = await api.projects.list({ ...ALL, sort: 'comments' });
      expect(byComments[0]?.id).toBe('p_night');
    });

    it('create → get → update → delete: полный цикл', async () => {
      const created = await api.projects.create({
        title: '  Новый трек  ',
        artist: 'Дым',
        description: 'Описание',
      });
      expect(created).toMatchObject({
        title: 'Новый трек',
        status: 'active',
        ownerId: DEMO_OWNER.id,
      });

      const detail = await api.projects.get(created.id);
      expect(detail).toMatchObject({ role: 'owner', versions: [] });
      expect(detail.members).toEqual([
        expect.objectContaining({ userId: DEMO_OWNER.id, role: 'owner' }),
      ]);

      const updated = await api.projects.update(created.id, {
        title: 'Переименован',
        status: 'approved',
      });
      expect(updated).toMatchObject({ title: 'Переименован', status: 'approved', artist: 'Дым' });

      await api.projects.remove(created.id);
      await expectApiError(api.projects.get(created.id), 404, 'NOT_FOUND');
      expect((await api.projects.list(ALL)).some((p) => p.id === created.id)).toBe(false);
    });

    it('create с пустым названием — 400 и ошибка в поле title', async () => {
      const error = await expectApiError(
        api.projects.create({ title: '', artist: 'Дым', description: '' }),
        400,
        'VALIDATION',
      );
      expect(error.fieldErrors).toHaveProperty('title');
    });

    it('update с некорректными данными — 400, данные не меняются', async () => {
      await expectApiError(api.projects.update('p_night', { title: 'А' }), 400);
      expect((await api.projects.get('p_night')).project.title).toBe('Ночной город');
    });

    it('get несуществующего проекта — 404', async () => {
      await expectApiError(api.projects.get('p_missing'), 404, 'NOT_FOUND');
    });

    it('удаление проекта каскадно убирает версии, правки и чек-листы', async () => {
      await api.checklist.generate('v_p_night_3');
      await api.projects.remove('p_night');

      const raw = JSON.parse(ctx.storage.getItem(DB_KEY) ?? '{}') as Record<
        string,
        { projectId?: string; versionId?: string }[]
      >;
      expect(raw.versions?.some((v) => v.projectId === 'p_night')).toBe(false);
      expect(raw.comments?.some((c) => c.versionId?.startsWith('v_p_night'))).toBe(false);
      expect(raw.checklists).toEqual([]);
      expect(raw.members?.some((m) => m.projectId === 'p_night')).toBe(false);
    });
  });

  describe('права доступа', () => {
    it('артист видит только проекты, куда приглашён', async () => {
      await loginArtist();
      const list = await api.projects.list(ALL);
      expect(list.map((p) => p.id)).toEqual(['p_night']);
      expect(list[0]?.role).toBe('artist');
    });

    it('чужой проект — 404, а не 403 (не раскрываем существование)', async () => {
      await loginArtist();
      await expectApiError(api.projects.get('p_summer'), 404);
    });

    it('артист не может изменять и удалять проект — 403', async () => {
      await loginArtist();
      await expectApiError(api.projects.update('p_night', { title: 'Взлом' }), 403, 'FORBIDDEN');
      await expectApiError(api.projects.remove('p_night'), 403, 'FORBIDDEN');
      await expectApiError(api.projects.invite('p_night', DEMO_OWNER.email), 403);
    });

    it('артист не может собирать чек-лист и отмечать пункты — 403', async () => {
      await loginArtist();
      await expectApiError(api.checklist.generate('v_p_night_3'), 403);
    });

    it('артист не может загрузить версию — 403', async () => {
      await loginArtist();
      await expectApiError(
        api.versions.create('p_night', {
          file: new Blob(['x']),
          fileName: 'mix.mp3',
          note: '',
          analysis: { durationSec: 10, peaks: [1], lufs: -14, peakDb: -1 },
        }),
        403,
      );
    });
  });

  describe('приглашения', () => {
    beforeEach(async () => {
      await loginOwner();
    });

    it('приглашает зарегистрированного пользователя как артиста', async () => {
      await api.auth.register({ name: 'Дым', email: 'dym@mail.ru', password: 'secret123' });
      await loginOwner();
      const members = await api.projects.invite('p_summer', 'DYM@mail.ru');
      expect(members).toEqual(
        expect.arrayContaining([expect.objectContaining({ email: 'dym@mail.ru', role: 'artist' })]),
      );
    });

    it('незарегистрированный e-mail — 404 с ошибкой в поле email', async () => {
      const error = await expectApiError(
        api.projects.invite('p_summer', 'ghost@mail.ru'),
        404,
        'USER_NOT_FOUND',
      );
      expect(error.fieldErrors).toHaveProperty('email');
    });

    it('повторное приглашение — 409', async () => {
      await expectApiError(
        api.projects.invite('p_night', DEMO_ARTIST.email),
        409,
        'ALREADY_MEMBER',
      );
    });

    it('некорректный e-mail — 400', async () => {
      await expectApiError(api.projects.invite('p_night', 'не-почта'), 400);
    });
  });

  describe('версии', () => {
    const upload = (projectId: string, note = 'Новая версия') =>
      api.versions.create(projectId, {
        file: new Blob(['audio'], { type: 'audio/mpeg' }),
        fileName: 'mix.mp3',
        note,
        analysis: { durationSec: 120, peaks: [0.1, 1], lufs: -9.5, peakDb: -0.4 },
      });

    beforeEach(async () => {
      await loginOwner();
    });

    it('нумерует версии подряд и сохраняет анализ звука', async () => {
      const version = await upload('p_night');
      expect(version).toMatchObject({
        number: 4,
        lufs: -9.5,
        durationSec: 120,
        peaks: [0.1, 1],
        fileUrl: `idb:${version.id}`,
      });
      expect((await api.projects.get('p_night')).versions.map((v) => v.number)).toEqual([
        1, 2, 3, 4,
      ]);
    });

    it('если заметка пустая, подставляется имя файла', async () => {
      expect((await upload('p_night', '')).note).toBe('mix.mp3');
    });

    it('загрузка в чужой или несуществующий проект — 404', async () => {
      await expectApiError(upload('p_missing'), 404);
    });

    it('audioUrl: демо-трек — путь от BASE_URL, загруженный файл — blob-ссылка', async () => {
      const seeded = (await api.projects.get('p_night')).versions[0];
      expect(seeded).toBeDefined();
      expect(await api.versions.audioUrl(seeded!)).toBe('/demo/track.mp3');

      URL.createObjectURL = () => 'blob:mixback-test';
      const uploaded = await upload('p_night');
      expect(await api.versions.audioUrl(uploaded)).toBe('blob:mixback-test');
    });

    it('audioUrl для потерянного файла — 404', async () => {
      await expectApiError(
        api.versions.audioUrl({ ...(await upload('p_night')), id: 'v_lost' }),
        404,
      );
    });
  });

  describe('комментарии', () => {
    it('list отдаёт правки версии по возрастанию таймкода', async () => {
      await loginOwner();
      const list = await api.comments.list('v_p_night_3');
      expect(list.map((c) => c.timeSec)).toEqual(
        [...list.map((c) => c.timeSec)].sort((a, b) => a - b),
      );
      expect(list).toHaveLength(7);
    });

    it('create записывает автора из сессии и ставит resolved=false', async () => {
      await loginArtist();
      const comment = await api.comments.create('v_p_night_3', {
        timeSec: 100,
        text: '  Новая правка  ',
      });
      expect(comment).toMatchObject({
        authorId: DEMO_ARTIST.id,
        authorName: 'Лера',
        text: 'Новая правка',
        resolved: false,
      });
    });

    it('create: таймкод за пределами трека — 400', async () => {
      await loginOwner();
      const error = await expectApiError(
        api.comments.create('v_p_night_3', { timeSec: 9999, text: 'Далеко' }),
        400,
      );
      expect(error.fieldErrors).toHaveProperty('timeSec');
    });

    it('create: пустой текст — 400', async () => {
      await loginOwner();
      await expectApiError(api.comments.create('v_p_night_3', { timeSec: 5, text: ' ' }), 400);
    });

    it('create в версии, к которой нет доступа — 404', async () => {
      await loginArtist();
      await expectApiError(api.comments.create('v_p_summer_1', { timeSec: 5, text: 'Чужое' }), 404);
    });

    it('владелец может отметить чужую правку решённой, артист — только свою', async () => {
      await loginOwner();
      expect((await api.comments.update('c_seed_1', { resolved: true })).resolved).toBe(true);

      await loginArtist();
      expect((await api.comments.update('c_seed_2', { resolved: true })).resolved).toBe(true);
      await expectApiError(api.comments.update('c_seed_4', { resolved: true }), 403);
    });

    it('текст можно менять только автору', async () => {
      await loginOwner();
      await expectApiError(api.comments.update('c_seed_1', { text: 'Подмена' }), 403);
      await loginArtist();
      expect((await api.comments.update('c_seed_1', { text: 'Уточнение' })).text).toBe('Уточнение');
    });

    it('удалять может автор или владелец проекта', async () => {
      await loginArtist();
      await expectApiError(api.comments.remove('c_seed_4'), 403);
      await api.comments.remove('c_seed_1');
      await loginOwner();
      await api.comments.remove('c_seed_2');
      const ids = (await api.comments.list('v_p_night_3')).map((c) => c.id);
      expect(ids).not.toContain('c_seed_1');
      expect(ids).not.toContain('c_seed_2');
    });

    it('несуществующая правка — 404', async () => {
      await loginOwner();
      await expectApiError(api.comments.update('c_nope', { resolved: true }), 404);
      await expectApiError(api.comments.remove('c_nope'), 404);
    });
  });

  describe('AI-чек-лист', () => {
    beforeEach(async () => {
      await loginOwner();
    });

    it('до генерации чек-листа нет', async () => {
      expect(await api.checklist.get('v_p_night_3')).toBeNull();
    });

    it('generate собирает пункты из нерешённых правок', async () => {
      const checklist = await api.checklist.generate('v_p_night_3');
      expect(checklist.items.length).toBeGreaterThan(0);
      expect(checklist.items.every((i) => !i.done)).toBe(true);
      const covered = checklist.items.flatMap((i) => i.commentIds);
      expect(covered).not.toContain('c_seed_7');
      expect(await api.checklist.get('v_p_night_3')).toEqual(checklist);
    });

    it('toggle отмечает пункт, а повторная генерация сохраняет отметки', async () => {
      const first = await api.checklist.generate('v_p_night_3');
      const target = first.items[0]!;
      await api.checklist.toggle('v_p_night_3', target.id, true);
      const again = await api.checklist.generate('v_p_night_3');
      expect(again.items.find((i) => i.id === target.id)?.done).toBe(true);
    });

    it('toggle несуществующего пункта — 404', async () => {
      await api.checklist.generate('v_p_night_3');
      await expectApiError(api.checklist.toggle('v_p_night_3', 'nope', true), 404);
    });
  });

  describe('имитация сети', () => {
    it('failNetwork: каждый запрос завершается сетевой ошибкой', async () => {
      ctx.controls.set({ failNetwork: true });
      const error = await expectApiError(api.auth.me(), 0, 'NETWORK');
      expect(error.message).toMatch(/Нет соединения/);
      ctx.controls.set({ failNetwork: false });
      expect(await api.auth.me()).toBeNull();
    });
  });

  describe('надёжность хранилища', () => {
    it('повреждённый JSON в localStorage заменяется демо-данными, а не ломает приложение', async () => {
      ctx.storage.setItem(DB_KEY, '{ это не json');
      await loginOwner();
      expect((await api.projects.list(ALL)).length).toBe(3);
    });

    it('данные несовместимой схемы пересоздаются', async () => {
      ctx.storage.setItem(DB_KEY, JSON.stringify({ schema: 999, users: [] }));
      await loginOwner();
      expect((await api.projects.list(ALL)).length).toBe(3);
    });

    it('параллельные записи не затирают друг друга', async () => {
      await loginOwner();
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          api.comments.create('v_p_night_3', { timeSec: i * 10, text: `Правка номер ${i}` }),
        ),
      );
      expect(await api.comments.list('v_p_night_3')).toHaveLength(7 + 10);
    });

    it('параллельный первый запуск создаёт демо-данные один раз', async () => {
      const results = await Promise.all([api.auth.me(), api.auth.me(), api.auth.me()]);
      expect(results).toEqual([null, null, null]);
      await loginOwner();
      expect((await api.projects.list(ALL)).length).toBe(3);
    });
  });
});
