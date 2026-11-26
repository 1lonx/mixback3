import { describe, expect, it } from 'vitest';
import { createStore } from '../../app/store';
import { createFakeApi, deferred, serverError } from '../../test/fakeApi';
import type { Comment } from '../../types/domain';
import {
  addComment,
  fetchComments,
  removeComment,
  selectAllComments,
  selectCommentsStatus,
  selectFilteredComments,
  selectOpenCommentsCount,
  updateComment,
} from './commentsSlice';

const comment = (id: string, timeSec: number, patch: Partial<Comment> = {}): Comment => ({
  id,
  versionId: 'v1',
  authorId: 'u1',
  authorName: 'Лера',
  timeSec,
  text: `Правка ${id}`,
  resolved: false,
  createdAt: `2026-11-01T00:00:0${timeSec % 10}.000Z`,
  ...patch,
});

function setup() {
  const api = createFakeApi();
  const store = createStore(api);
  return { api, store };
}

async function loaded(comments: Comment[]) {
  const ctx = setup();
  ctx.api.comments.list.mockResolvedValue(comments);
  await ctx.store.dispatch(fetchComments('v1'));
  return ctx;
}

describe('commentsSlice', () => {
  it('загрузка: loading → succeeded, правки отсортированы по таймкоду', async () => {
    const { api, store } = setup();
    const pending = deferred<Comment[]>();
    api.comments.list.mockReturnValue(pending.promise);

    const promise = store.dispatch(fetchComments('v1'));
    expect(selectCommentsStatus(store.getState())).toBe('loading');
    pending.resolve([comment('c', 90), comment('a', 10), comment('b', 40)]);
    await promise;

    expect(selectCommentsStatus(store.getState())).toBe('succeeded');
    expect(selectAllComments(store.getState()).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('ошибка загрузки → failed', async () => {
    const { api, store } = setup();
    api.comments.list.mockRejectedValue(serverError(500, 'упало'));
    await store.dispatch(fetchComments('v1'));
    expect(selectCommentsStatus(store.getState())).toBe('failed');
    expect(store.getState().comments.error?.message).toBe('упало');
  });

  it('переключение версии очищает правки предыдущей версии, пока грузятся новые', async () => {
    const { api, store } = await loaded([comment('a', 10)]);
    api.comments.list.mockReturnValue(new Promise(() => undefined));
    void store.dispatch(fetchComments('v2'));
    expect(selectAllComments(store.getState())).toEqual([]);
    expect(store.getState().comments.versionId).toBe('v2');
  });

  it('перезагрузка той же версии не стирает список (нет мигания)', async () => {
    const { api, store } = await loaded([comment('a', 10)]);
    api.comments.list.mockReturnValue(new Promise(() => undefined));
    void store.dispatch(fetchComments('v1'));
    expect(selectAllComments(store.getState())).toHaveLength(1);
  });

  it('гонка версий: ответ по прежней версии игнорируется', async () => {
    const { api, store } = setup();
    const slow = deferred<Comment[]>();
    api.comments.list
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce([comment('new', 5, { versionId: 'v2' })]);

    const first = store.dispatch(fetchComments('v1'));
    await store.dispatch(fetchComments('v2'));
    slow.resolve([comment('stale', 1)]);
    await first;

    expect(selectAllComments(store.getState()).map((c) => c.id)).toEqual(['new']);
  });

  describe('addComment', () => {
    it('добавляет правку на нужное место по времени', async () => {
      const { api, store } = await loaded([comment('a', 10), comment('c', 90)]);
      api.comments.create.mockResolvedValue(comment('b', 40));
      await store.dispatch(
        addComment({ versionId: 'v1', input: { timeSec: 40, text: 'Правка b' } }),
      );
      expect(selectAllComments(store.getState()).map((c) => c.id)).toEqual(['a', 'b', 'c']);
    });

    it('правка к другой версии (запоздалый ответ) в список не попадает', async () => {
      const { api, store } = await loaded([comment('a', 10)]);
      api.comments.create.mockResolvedValue(comment('x', 20, { versionId: 'other' }));
      await store.dispatch(
        addComment({ versionId: 'other', input: { timeSec: 20, text: 'Чужая' } }),
      );
      expect(selectAllComments(store.getState()).map((c) => c.id)).toEqual(['a']);
    });

    it('ошибка валидации сервера доступна вызывающему коду через unwrap', async () => {
      const { api, store } = await loaded([]);
      api.comments.create.mockRejectedValue(serverError(400, 'Проверьте поля'));
      await expect(
        store.dispatch(addComment({ versionId: 'v1', input: { timeSec: 1, text: 'ab' } })).unwrap(),
      ).rejects.toMatchObject({ status: 400, message: 'Проверьте поля' });
    });
  });

  describe('updateComment — оптимистичное «решено»', () => {
    it('галочка ставится сразу, до ответа сервера', async () => {
      const { api, store } = await loaded([comment('a', 10)]);
      const pending = deferred<Comment>();
      api.comments.update.mockReturnValue(pending.promise);

      const promise = store.dispatch(updateComment({ id: 'a', patch: { resolved: true } }));
      expect(selectAllComments(store.getState())[0]?.resolved).toBe(true);

      pending.resolve(comment('a', 10, { resolved: true }));
      await promise;
      expect(selectAllComments(store.getState())[0]?.resolved).toBe(true);
    });

    it('при ошибке сервера значение откатывается', async () => {
      const { api, store } = await loaded([comment('a', 10)]);
      api.comments.update.mockRejectedValue(serverError(403, 'Нельзя'));
      await store.dispatch(updateComment({ id: 'a', patch: { resolved: true } }));
      expect(selectAllComments(store.getState())[0]?.resolved).toBe(false);
    });

    it('откат работает и в обратную сторону (снятие галочки)', async () => {
      const { api, store } = await loaded([comment('a', 10, { resolved: true })]);
      api.comments.update.mockRejectedValue(serverError());
      await store.dispatch(updateComment({ id: 'a', patch: { resolved: false } }));
      expect(selectAllComments(store.getState())[0]?.resolved).toBe(true);
    });

    it('правка текста не трогает resolved до ответа', async () => {
      const { api, store } = await loaded([comment('a', 10, { resolved: true })]);
      api.comments.update.mockReturnValue(new Promise(() => undefined));
      void store.dispatch(updateComment({ id: 'a', patch: { text: 'Новый текст' } }));
      expect(selectAllComments(store.getState())[0]).toMatchObject({
        resolved: true,
        text: 'Правка a',
      });
    });
  });

  it('removeComment убирает правку', async () => {
    const { api, store } = await loaded([comment('a', 10), comment('b', 20)]);
    api.comments.remove.mockResolvedValue(undefined);
    await store.dispatch(removeComment('a'));
    expect(selectAllComments(store.getState()).map((c) => c.id)).toEqual(['b']);
  });

  it('неудачное удаление оставляет правку на месте', async () => {
    const { api, store } = await loaded([comment('a', 10)]);
    api.comments.remove.mockRejectedValue(serverError(403));
    await store.dispatch(removeComment('a'));
    expect(selectAllComments(store.getState())).toHaveLength(1);
  });

  describe('селекторы', () => {
    const data = [comment('a', 10), comment('b', 20, { resolved: true }), comment('c', 30)];

    it('selectFilteredComments: all / open / resolved', async () => {
      const { store } = await loaded(data);
      const state = store.getState();
      expect(selectFilteredComments(state, 'all')).toHaveLength(3);
      expect(selectFilteredComments(state, 'open').map((c) => c.id)).toEqual(['a', 'c']);
      expect(selectFilteredComments(state, 'resolved').map((c) => c.id)).toEqual(['b']);
    });

    it('selectOpenCommentsCount', async () => {
      const { store } = await loaded(data);
      expect(selectOpenCommentsCount(store.getState())).toBe(2);
    });

    it('мемоизация: тот же state и фильтр → тот же массив (нет лишних перерисовок)', async () => {
      const { store } = await loaded(data);
      const state = store.getState();
      expect(selectFilteredComments(state, 'open')).toBe(selectFilteredComments(state, 'open'));
    });
  });
});
