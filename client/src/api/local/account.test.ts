import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_ARTIST, DEMO_OWNER, DEMO_PASSWORD } from '../../lib/demoAccounts';
import { ApiError } from '../../lib/errors';
import { createTestApi, type TestApi } from '../../test/utils';
import { DB_KEY } from './db';
import { LOCKOUT_MS, MAX_LOGIN_ATTEMPTS, SESSION_TTL_MS } from './createLocalApi';
import { PBKDF2_ITERATIONS } from './password';

async function expectApiError(promise: Promise<unknown>, status: number, code?: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, ...(code ? { code } : {}) });
  return error as ApiError;
}

describe('безопасность и аккаунт (мок-сервер)', () => {
  let ctx: TestApi;
  const api = () => ctx.api;
  const login = (email: string = DEMO_OWNER.email, password: string = DEMO_PASSWORD) =>
    api().auth.login({ email, password });

  beforeEach(() => {
    ctx = createTestApi();
  });

  describe('блокировка перебора пароля', () => {
    const fail = (email: string = DEMO_OWNER.email) =>
      login(email, 'wrong-pass1').catch((e: unknown) => e);

    it(`после ${MAX_LOGIN_ATTEMPTS} неудачных попыток вход блокируется (429), даже с верным паролем`, async () => {
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
        expect(await fail()).toMatchObject({ status: 401 });
      }
      const locked = await expectApiError(login(), 429, 'TOO_MANY_ATTEMPTS');
      expect(locked.message).toMatch(/Повторите через \d+ с/);
    });

    it('блокировка снимается через минуту', async () => {
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await fail();
      ctx.advanceTime(LOCKOUT_MS + 1000);
      expect((await login()).user.id).toBe(DEMO_OWNER.id);
    });

    it('успешный вход сбрасывает счётчик', async () => {
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) await fail();
      await login();
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++)
        expect(await fail()).toMatchObject({ status: 401 });
    });

    it('блокировка действует на адрес, а не на аккаунт другого пользователя', async () => {
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await fail();
      expect((await login(DEMO_ARTIST.email)).user.id).toBe(DEMO_ARTIST.id);
    });

    it('несуществующий адрес блокируется так же — по ответу нельзя узнать, кто зарегистрирован', async () => {
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await fail('ghost@mail.ru');
      await expectApiError(login('ghost@mail.ru'), 429);
    });

    it('регистр и пробелы в e-mail не позволяют обойти лимит', async () => {
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await fail(' DEMO@mixback.app ');
      await expectApiError(login(), 429);
    });
  });

  describe('срок сессии', () => {
    it('сессия действует неделю', async () => {
      await login();
      ctx.advanceTime(SESSION_TTL_MS - 60_000);
      expect(await api().auth.me()).not.toBeNull();
    });

    it('после истечения me() даёт null, а защищённые методы — 401 с понятным текстом', async () => {
      await login();
      ctx.advanceTime(SESSION_TTL_MS + 1000);
      expect(await api().auth.me()).toBeNull();
      const error = await expectApiError(
        api().projects.list({ q: '', status: 'all', sort: 'updated' }),
        401,
      );
      expect(error.message).toMatch(/Войдите снова|Нужно войти/);
    });

    it('просроченная сессия удаляется из хранилища', async () => {
      await login();
      ctx.advanceTime(SESSION_TTL_MS + 1000);
      await api().auth.me();
      expect(JSON.parse(ctx.storage.getItem(DB_KEY) ?? '{}')).toMatchObject({ session: null });
    });
  });

  describe('пароли', () => {
    it(`хешируются PBKDF2 (${PBKDF2_ITERATIONS} итераций) с отдельной солью на пользователя`, async () => {
      await api().auth.register({ name: 'Один', email: 'one@mail.ru', password: 'same-pass1' });
      await api().auth.register({ name: 'Два', email: 'two@mail.ru', password: 'same-pass1' });
      const db = JSON.parse(ctx.storage.getItem(DB_KEY) ?? '{}') as {
        users: { email: string; passwordHash: string; salt: string }[];
      };
      const [one, two] = ['one@mail.ru', 'two@mail.ru'].map((e) =>
        db.users.find((u) => u.email === e)!,
      );
      expect(one?.passwordHash).toMatch(/^[0-9a-f]{64}$/);
      expect(one?.salt).not.toBe(two?.salt);
      expect(one?.passwordHash).not.toBe(two?.passwordHash);
      expect(ctx.storage.getItem(DB_KEY)).not.toContain('same-pass1');
    });
  });

  describe('очистка данных на «сервере»', () => {
    it('невидимые и управляющие символы вырезаются из имён и текста', async () => {
      const session = await api().auth.register({
        name: 'Ал​екс‮',
        email: 'clean@mail.ru',
        password: 'secret123',
      });
      expect(session.user.name).toBe('Алекс');
      await login();
      const comment = await api().comments.create('v_p_night_3', {
        timeSec: 5,
        text: 'Бочка\u0000‮ бубнит',
      });
      expect(comment.text).toBe('Бочка бубнит');
    });

    it('двойник имени из невидимых символов не создаётся', async () => {
      await expectApiError(
        api().auth.register({ name: '​​', email: 'inv@mail.ru', password: 'secret123' }),
        400,
      );
    });
  });

  describe('адреса аудио', () => {
    const version = (fileUrl: string) => ({
      id: 'v_x',
      projectId: 'p',
      number: 1,
      note: '',
      fileUrl,
      durationSec: 1,
      peaks: null,
      lufs: -14,
      peakDb: -1,
      createdAt: '',
    });

    it.each([
      'https://evil.com/a.mp3',
      'javascript:alert(1)',
      'data:audio/mp3;base64,AAAA',
      '../../etc/passwd',
      'demo/../secret',
    ])('отклоняет %s', async (url) => {
      await expectApiError(api().versions.audioUrl(version(url)), 400, 'UNSAFE_URL');
    });

    it('допускает демо-трек', async () => {
      expect(await api().versions.audioUrl(version('demo/track.mp3'))).toBe('/demo/track.mp3');
    });
  });

  describe('профиль', () => {
    beforeEach(async () => {
      await login();
    });

    it('profile: пользователь, даты и статистика', async () => {
      const profile = await api().auth.profile();
      expect(profile.user).toEqual({
        id: DEMO_OWNER.id,
        email: DEMO_OWNER.email,
        name: DEMO_OWNER.name,
      });
      expect(profile.stats).toEqual({
        projectsOwned: 3,
        projectsShared: 0,
        versions: 6,
        comments: 2,
        resolved: 1,
      });
      expect(
        new Date(profile.session.expiresAt).getTime() -
          new Date(profile.session.createdAt).getTime(),
      ).toBe(SESSION_TTL_MS);
    });

    it('статистика артиста: он участник чужого проекта', async () => {
      await login(DEMO_ARTIST.email);
      const { stats } = await api().auth.profile();
      expect(stats).toMatchObject({ projectsOwned: 0, projectsShared: 1, comments: 7 });
    });

    it('без входа профиль недоступен — 401', async () => {
      await api().auth.logout();
      await expectApiError(api().auth.profile(), 401);
    });

    it('updateProfile меняет имя и подтягивает его в уже оставленные правки', async () => {
      const user = await api().auth.updateProfile({ name: '  Алекс Новый  ' });
      expect(user.name).toBe('Алекс Новый');
      expect((await api().auth.me())?.name).toBe('Алекс Новый');
      const comments = await api().comments.list('v_p_night_3');
      expect(comments.find((c) => c.id === 'c_seed_4')?.authorName).toBe('Алекс Новый');
    });

    it('updateProfile: короткое имя — 400', async () => {
      const error = await expectApiError(api().auth.updateProfile({ name: 'А' }), 400);
      expect(error.fieldErrors).toHaveProperty('name');
    });

    describe('changePassword', () => {
      it('меняет пароль: со старым войти нельзя, с новым — можно', async () => {
        await api().auth.changePassword({
          currentPassword: DEMO_PASSWORD,
          newPassword: 'brand-new-pass9',
        });
        await api().auth.logout();
        await expectApiError(login(DEMO_OWNER.email, DEMO_PASSWORD), 401);
        expect((await login(DEMO_OWNER.email, 'brand-new-pass9')).user.id).toBe(DEMO_OWNER.id);
      });

      it('выдаёт новый токен: прежний перестаёт действовать', async () => {
        const before = await login();
        const after = await api().auth.changePassword({
          currentPassword: DEMO_PASSWORD,
          newPassword: 'brand-new-pass9',
        });
        expect(after.token).not.toBe(before.token);
        const db = JSON.parse(ctx.storage.getItem(DB_KEY) ?? '{}') as {
          session: { token: string };
        };
        expect(db.session.token).toBe(after.token);
      });

      it('неверный текущий пароль — 401, пароль не меняется', async () => {
        await expectApiError(
          api().auth.changePassword({
            currentPassword: 'not-my-pass1',
            newPassword: 'brand-new-pass9',
          }),
          401,
          'BAD_CREDENTIALS',
        );
        await api().auth.logout();
        expect((await login()).user.id).toBe(DEMO_OWNER.id);
      });

      it('слабый новый пароль и совпадение с текущим — 400', async () => {
        await expectApiError(
          api().auth.changePassword({ currentPassword: DEMO_PASSWORD, newPassword: 'short1' }),
          400,
        );
        await expectApiError(
          api().auth.changePassword({ currentPassword: DEMO_PASSWORD, newPassword: DEMO_PASSWORD }),
          400,
        );
      });

      it('подбор текущего пароля через смену тоже ограничен лимитом попыток', async () => {
        for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
          await api()
            .auth.changePassword({ currentPassword: 'wrong-pass1', newPassword: 'brand-new-pass9' })
            .catch(() => null);
        }
        await expectApiError(
          api().auth.changePassword({
            currentPassword: DEMO_PASSWORD,
            newPassword: 'brand-new-pass9',
          }),
          429,
        );
      });
    });

    describe('deleteAccount', () => {
      it('неверный пароль — 401, аккаунт остаётся', async () => {
        await expectApiError(api().auth.deleteAccount({ password: 'wrong-pass1' }), 401);
        expect(await api().auth.me()).not.toBeNull();
      });

      it('пустой пароль — 400', async () => {
        await expectApiError(api().auth.deleteAccount({ password: '' }), 400);
      });

      it('удаляет пользователя, его проекты (каскадом) и закрывает сессию', async () => {
        await api().auth.deleteAccount({ password: DEMO_PASSWORD });
        expect(await api().auth.me()).toBeNull();
        await expectApiError(login(), 401);

        const db = JSON.parse(ctx.storage.getItem(DB_KEY) ?? '{}') as Record<
          string,
          { id?: string; projectId?: string; userId?: string; authorId?: string }[]
        >;
        expect(db.users?.some((u) => u.id === DEMO_OWNER.id)).toBe(false);
        expect(db.projects).toEqual([]);
        expect(db.versions).toEqual([]);
        expect(db.comments?.some((c) => c.authorId === DEMO_OWNER.id)).toBe(false);
        expect(db.members?.some((m) => m.userId === DEMO_OWNER.id)).toBe(false);
      });

      it('проекты других владельцев не затрагиваются: артист удаляет аккаунт, проект Алекса остаётся', async () => {
        await login(DEMO_ARTIST.email);
        await api().auth.deleteAccount({ password: DEMO_PASSWORD });
        await login();
        const detail = await api().projects.get('p_night');
        expect(detail.members.map((m) => m.userId)).toEqual([DEMO_OWNER.id]);
        const comments = await api().comments.list('v_p_night_3');
        expect(comments.every((c) => c.authorId === DEMO_OWNER.id)).toBe(true);
      });
    });
  });
});
