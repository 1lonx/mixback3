import { describe, expect, it } from 'vitest';
import { createStore } from '../../app/store';
import { createFakeApi, deferred, serverError } from '../../test/fakeApi';
import type { ProjectsQuery, ProjectSummary } from '../../types/domain';
import { deleteProject } from '../project/projectSlice';
import { fetchProjects, selectAllProjects, selectProjectsStatus } from './projectsSlice';

const query: ProjectsQuery = { q: '', status: 'all', sort: 'updated' };

const summary = (id: string, title = id): ProjectSummary => ({
  id,
  title,
  artist: 'Артист',
  description: '',
  status: 'active',
  ownerId: 'u1',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  role: 'owner',
  versionsCount: 1,
  openComments: 0,
});

function setup() {
  const api = createFakeApi();
  const store = createStore(api);
  return { api, store };
}

describe('projectsSlice', () => {
  it('idle → loading → succeeded и данные кладутся в хранилище сущностей', async () => {
    const { api, store } = setup();
    const pending = deferred<ProjectSummary[]>();
    api.projects.list.mockReturnValue(pending.promise);

    expect(selectProjectsStatus(store.getState())).toBe('idle');
    const promise = store.dispatch(fetchProjects(query));
    expect(selectProjectsStatus(store.getState())).toBe('loading');

    pending.resolve([summary('a'), summary('b')]);
    await promise;

    expect(selectProjectsStatus(store.getState())).toBe('succeeded');
    expect(selectAllProjects(store.getState()).map((p) => p.id)).toEqual(['a', 'b']);
    expect(store.getState().projects.loadedQuery).toEqual(query);
  });

  it('передаёт параметры поиска в API', async () => {
    const { api, store } = setup();
    api.projects.list.mockResolvedValue([]);
    const custom: ProjectsQuery = { q: 'ночь', status: 'approved', sort: 'title' };
    await store.dispatch(fetchProjects(custom));
    expect(api.projects.list).toHaveBeenCalledWith(custom);
  });

  it('пустой ответ — это succeeded с пустым списком, а не ошибка', async () => {
    const { api, store } = setup();
    api.projects.list.mockResolvedValue([]);
    await store.dispatch(fetchProjects(query));
    expect(selectProjectsStatus(store.getState())).toBe('succeeded');
    expect(selectAllProjects(store.getState())).toEqual([]);
  });

  it('ошибка → failed и текст ошибки', async () => {
    const { api, store } = setup();
    api.projects.list.mockRejectedValue(serverError(500, 'База недоступна'));
    await store.dispatch(fetchProjects(query));
    expect(selectProjectsStatus(store.getState())).toBe('failed');
    expect(store.getState().projects.error).toMatchObject({
      status: 500,
      message: 'База недоступна',
    });
  });

  it('повторный запрос после ошибки сбрасывает её', async () => {
    const { api, store } = setup();
    api.projects.list.mockRejectedValueOnce(serverError());
    await store.dispatch(fetchProjects(query));
    api.projects.list.mockResolvedValue([summary('a')]);
    await store.dispatch(fetchProjects(query));
    expect(store.getState().projects.error).toBeNull();
    expect(selectAllProjects(store.getState())).toHaveLength(1);
  });

  it('гонка запросов: поздний ответ на старый запрос не затирает свежий', async () => {
    const { api, store } = setup();
    const slow = deferred<ProjectSummary[]>();
    const fast = deferred<ProjectSummary[]>();
    api.projects.list.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

    const first = store.dispatch(fetchProjects({ ...query, q: 'н' }));
    const second = store.dispatch(fetchProjects({ ...query, q: 'ночь' }));

    fast.resolve([summary('night')]);
    await second;
    slow.resolve([summary('old-1'), summary('old-2')]);
    await first;

    expect(selectAllProjects(store.getState()).map((p) => p.id)).toEqual(['night']);
    expect(store.getState().projects.loadedQuery?.q).toBe('ночь');
  });

  it('гонка: ошибка устаревшего запроса не переводит список в failed', async () => {
    const { api, store } = setup();
    const slow = deferred<ProjectSummary[]>();
    api.projects.list.mockReturnValueOnce(slow.promise).mockResolvedValueOnce([summary('ok')]);

    const first = store.dispatch(fetchProjects(query));
    await store.dispatch(fetchProjects({ ...query, q: 'x' }));
    slow.reject(serverError());
    await first;

    expect(selectProjectsStatus(store.getState())).toBe('succeeded');
  });

  it('удаление проекта убирает его из списка', async () => {
    const { api, store } = setup();
    api.projects.list.mockResolvedValue([summary('a'), summary('b')]);
    api.projects.remove.mockResolvedValue(undefined);
    await store.dispatch(fetchProjects(query));
    await store.dispatch(deleteProject('a'));
    expect(selectAllProjects(store.getState()).map((p) => p.id)).toEqual(['b']);
  });

  it('неудачное удаление не трогает список', async () => {
    const { api, store } = setup();
    api.projects.list.mockResolvedValue([summary('a')]);
    api.projects.remove.mockRejectedValue(serverError(403, 'Нет прав'));
    await store.dispatch(fetchProjects(query));
    const result = await store.dispatch(deleteProject('a'));
    expect(result.type).toBe('project/delete/rejected');
    expect(selectAllProjects(store.getState())).toHaveLength(1);
  });
});
