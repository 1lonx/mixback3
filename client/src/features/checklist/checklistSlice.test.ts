import { describe, expect, it } from 'vitest';
import { createStore } from '../../app/store';
import { createFakeApi, deferred, serverError } from '../../test/fakeApi';
import type { Checklist } from '../../types/domain';
import {
  fetchChecklist,
  generateChecklist,
  selectChecklistEntry,
  selectChecklistProgress,
  toggleChecklistItem,
} from './checklistSlice';

const checklist: Checklist = {
  versionId: 'v1',
  generatedAt: '2026-11-01T00:00:00.000Z',
  items: [
    {
      id: 'i1',
      category: 'low',
      text: 'Подрезать низ',
      commentIds: ['c1'],
      timeSec: 10,
      done: false,
    },
    {
      id: 'i2',
      category: 'vocal',
      text: 'Поднять вокал',
      commentIds: ['c2'],
      timeSec: 30,
      done: true,
    },
  ],
};

function setup() {
  const api = createFakeApi();
  const store = createStore(api);
  return { api, store };
}

describe('checklistSlice', () => {
  it('для неизвестной версии возвращается пустая запись idle', () => {
    const { store } = setup();
    expect(selectChecklistEntry(store.getState(), 'v1')).toEqual({
      status: 'idle',
      error: null,
      data: null,
    });
  });

  it('fetch: чек-листа ещё нет → succeeded с data=null', async () => {
    const { api, store } = setup();
    api.checklist.get.mockResolvedValue(null);
    await store.dispatch(fetchChecklist('v1'));
    expect(selectChecklistEntry(store.getState(), 'v1')).toMatchObject({
      status: 'succeeded',
      data: null,
    });
  });

  it('generate: loading → succeeded', async () => {
    const { api, store } = setup();
    const pending = deferred<Checklist>();
    api.checklist.generate.mockReturnValue(pending.promise);

    const promise = store.dispatch(generateChecklist('v1'));
    expect(selectChecklistEntry(store.getState(), 'v1').status).toBe('loading');
    pending.resolve(checklist);
    await promise;

    expect(selectChecklistEntry(store.getState(), 'v1')).toMatchObject({
      status: 'succeeded',
      data: checklist,
    });
  });

  it('generate: ошибка → failed, прежний чек-лист не пропадает', async () => {
    const { api, store } = setup();
    api.checklist.generate
      .mockResolvedValueOnce(checklist)
      .mockRejectedValueOnce(serverError(502, 'AI недоступен'));
    await store.dispatch(generateChecklist('v1'));
    await store.dispatch(generateChecklist('v1'));
    const entry = selectChecklistEntry(store.getState(), 'v1');
    expect(entry.status).toBe('failed');
    expect(entry.error?.message).toBe('AI недоступен');
    expect(entry.data).toEqual(checklist);
  });

  it('состояния разных версий независимы', async () => {
    const { api, store } = setup();
    api.checklist.generate.mockResolvedValue(checklist);
    await store.dispatch(generateChecklist('v1'));
    expect(selectChecklistEntry(store.getState(), 'v2').status).toBe('idle');
  });

  describe('toggleChecklistItem', () => {
    async function withChecklist() {
      const ctx = setup();
      ctx.api.checklist.generate.mockResolvedValue(structuredClone(checklist));
      await ctx.store.dispatch(generateChecklist('v1'));
      return ctx;
    }

    it('отметка применяется сразу (оптимистично)', async () => {
      const { api, store } = await withChecklist();
      api.checklist.toggle.mockReturnValue(new Promise(() => undefined));
      void store.dispatch(toggleChecklistItem({ versionId: 'v1', itemId: 'i1', done: true }));
      expect(selectChecklistEntry(store.getState(), 'v1').data?.items[0]?.done).toBe(true);
    });

    it('при ошибке отметка откатывается', async () => {
      const { api, store } = await withChecklist();
      api.checklist.toggle.mockRejectedValue(serverError());
      await store.dispatch(toggleChecklistItem({ versionId: 'v1', itemId: 'i1', done: true }));
      expect(selectChecklistEntry(store.getState(), 'v1').data?.items[0]?.done).toBe(false);
    });

    it('неизвестный пункт не вызывает падения', async () => {
      const { api, store } = await withChecklist();
      api.checklist.toggle.mockResolvedValue(checklist);
      await store.dispatch(toggleChecklistItem({ versionId: 'v1', itemId: 'nope', done: true }));
      expect(selectChecklistEntry(store.getState(), 'v1').data?.items).toHaveLength(2);
    });
  });

  it('selectChecklistProgress считает выполненные пункты', async () => {
    const { api, store } = setup();
    api.checklist.generate.mockResolvedValue(checklist);
    await store.dispatch(generateChecklist('v1'));
    expect(selectChecklistProgress(store.getState(), 'v1')).toEqual({ done: 1, total: 2 });
    expect(selectChecklistProgress(store.getState(), 'other')).toEqual({ done: 0, total: 0 });
  });
});
