import { describe, expect, it } from 'vitest';
import { createStore } from '../../app/store';
import { ApiError } from '../../lib/errors';
import { createFakeApi, deferred } from '../../test/fakeApi';
import { clearAuthError, login, logout, register, restoreSession } from './authSlice';

const user = { id: 'u1', email: 'a@b.ru', name: 'Алекс' };

function setup() {
  const api = createFakeApi();
  const store = createStore(api);
  return { api, store };
}

describe('authSlice', () => {
  it('начальное состояние: пользователя нет, сессия не проверена', () => {
    const { store } = setup();
    expect(store.getState().auth).toEqual({
      user: null,
      initialized: false,
      sessionError: null,
      status: 'idle',
      error: null,
    });
  });

  describe('restoreSession', () => {
    it('нашли сессию → пользователь в state, initialized=true', async () => {
      const { api, store } = setup();
      api.auth.me.mockResolvedValue(user);
      await store.dispatch(restoreSession());
      expect(store.getState().auth).toMatchObject({ user, initialized: true });
    });

    it('сессии нет → user=null, но initialized=true', async () => {
      const { api, store } = setup();
      api.auth.me.mockResolvedValue(null);
      await store.dispatch(restoreSession());
      expect(store.getState().auth).toMatchObject({ user: null, initialized: true });
    });

    it('ошибка сети при старте не блокирует приложение и запоминается отдельно от «не вошли»', async () => {
      const { api, store } = setup();
      api.auth.me.mockRejectedValue(new ApiError(0, 'NETWORK', 'Нет сети'));
      await store.dispatch(restoreSession());
      expect(store.getState().auth).toMatchObject({
        user: null,
        initialized: true,
        sessionError: { status: 0, message: 'Нет сети' },
      });
    });

    it('повторная проверка сессии сбрасывает ошибку', async () => {
      const { api, store } = setup();
      api.auth.me.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'Нет сети'));
      await store.dispatch(restoreSession());
      api.auth.me.mockResolvedValue(user);
      const promise = store.dispatch(restoreSession());
      expect(store.getState().auth.sessionError).toBeNull();
      await promise;
      expect(store.getState().auth).toMatchObject({ user, sessionError: null });
    });
  });

  describe('login / register', () => {
    it.each([
      ['login', login, 'login'],
      ['register', register, 'register'],
    ] as const)('%s: loading → succeeded', async (_name, thunk, method) => {
      const { api, store } = setup();
      const pending = deferred<{ user: typeof user; token: string }>();
      api.auth[method].mockReturnValue(pending.promise);

      const promise = store.dispatch(
        thunk({ email: 'a@b.ru', password: 'secret123', name: 'Алекс' }),
      );
      expect(store.getState().auth.status).toBe('loading');

      pending.resolve({ user, token: 't' });
      await promise;
      expect(store.getState().auth).toMatchObject({ status: 'succeeded', user, error: null });
    });

    it('login: ошибка сервера попадает в state как простой объект', async () => {
      const { api, store } = setup();
      api.auth.login.mockRejectedValue(
        new ApiError(401, 'BAD_CREDENTIALS', 'Неверный e-mail или пароль'),
      );
      await store.dispatch(login({ email: 'a@b.ru', password: 'x' }));
      expect(store.getState().auth).toMatchObject({
        status: 'failed',
        user: null,
        error: { status: 401, code: 'BAD_CREDENTIALS', message: 'Неверный e-mail или пароль' },
      });
    });

    it('register: ошибки по полям сохраняются', async () => {
      const { api, store } = setup();
      api.auth.register.mockRejectedValue(
        new ApiError(409, 'EMAIL_TAKEN', 'занят', { email: 'Этот e-mail уже зарегистрирован' }),
      );
      await store.dispatch(register({ name: 'Алекс', email: 'a@b.ru', password: 'secret123' }));
      expect(store.getState().auth.error?.fieldErrors).toEqual({
        email: 'Этот e-mail уже зарегистрирован',
      });
    });

    it('новая попытка входа очищает прошлую ошибку', async () => {
      const { api, store } = setup();
      api.auth.login.mockRejectedValueOnce(new ApiError(401, 'X', 'плохо'));
      await store.dispatch(login({ email: 'a@b.ru', password: 'x' }));
      expect(store.getState().auth.error).not.toBeNull();

      api.auth.login.mockResolvedValue({ user, token: 't' });
      const promise = store.dispatch(login({ email: 'a@b.ru', password: 'x' }));
      expect(store.getState().auth.error).toBeNull();
      await promise;
    });

    it('clearAuthError', async () => {
      const { api, store } = setup();
      api.auth.login.mockRejectedValue(new ApiError(401, 'X', 'плохо'));
      await store.dispatch(login({ email: 'a@b.ru', password: 'x' }));
      store.dispatch(clearAuthError());
      expect(store.getState().auth.error).toBeNull();
    });

    it('неожиданное исключение (не ApiError) тоже становится понятной ошибкой', async () => {
      const { api, store } = setup();
      api.auth.login.mockRejectedValue(new TypeError('boom'));
      await store.dispatch(login({ email: 'a@b.ru', password: 'x' }));
      expect(store.getState().auth.error).toEqual({ status: 0, code: 'UNKNOWN', message: 'boom' });
    });
  });

  describe('logout', () => {
    it('повторный вход в той же вкладке снова помечает сессию проверенной (иначе защищённые страницы зависают)', async () => {
      const { api, store } = setup();
      api.auth.me.mockResolvedValue(user);
      api.auth.logout.mockResolvedValue(undefined);
      api.auth.login.mockResolvedValue({ user, token: 't' });
      await store.dispatch(restoreSession());
      await store.dispatch(logout());
      expect(store.getState().auth.initialized).toBe(false);
      await store.dispatch(login({ email: 'a@b.ru', password: 'x' }));
      expect(store.getState().auth).toMatchObject({ user, initialized: true });
    });

    it('сбрасывает всё состояние приложения, а не только пользователя', async () => {
      const { api, store } = setup();
      api.auth.login.mockResolvedValue({ user, token: 't' });
      api.auth.logout.mockResolvedValue(undefined);
      await store.dispatch(login({ email: 'a@b.ru', password: 'x' }));
      store.dispatch({
        type: 'toasts/pushToast',
        payload: { id: '1', kind: 'info', message: 'привет' },
      });
      expect(store.getState().toasts).toHaveLength(1);

      await store.dispatch(logout());
      const state = store.getState();
      expect(state.auth.user).toBeNull();
      expect(state.toasts).toEqual([]);
      expect(state.projects.ids).toEqual([]);
    });

    it('пользователь выходит из интерфейса сразу, не дожидаясь ответа сервера', () => {
      const { api, store } = setup();
      api.auth.logout.mockReturnValue(new Promise(() => undefined));
      void store.dispatch(logout());
      expect(store.getState().auth.user).toBeNull();
    });
  });
});
