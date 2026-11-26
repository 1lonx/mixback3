import { describe, expect, it } from 'vitest';
import { createStore } from '../../app/store';
import { createFakeApi, deferred, serverError } from '../../test/fakeApi';
import type { Project, ProjectDetail, Version } from '../../types/domain';
import {
  deleteProject,
  fetchProject,
  inviteMember,
  selectProjectDetail,
  selectProjectStatus,
  updateProject,
  uploadVersion,
} from './projectSlice';

const project = (id: string, title = id): Project => ({
  id,
  title,
  artist: 'Лера',
  description: '',
  status: 'active',
  ownerId: 'u1',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
});

const version = (projectId: string, number: number): Version => ({
  id: `v${number}`,
  projectId,
  number,
  note: '',
  fileUrl: 'demo/track.mp3',
  durationSec: 100,
  peaks: null,
  lufs: -14,
  peakDb: -1,
  createdAt: '2026-11-01T00:00:00.000Z',
});

const detail = (id: string): ProjectDetail => ({
  project: project(id),
  role: 'owner',
  members: [{ userId: 'u1', name: 'Алекс', email: 'a@b.ru', role: 'owner' }],
  versions: [version(id, 1)],
});

function setup() {
  const api = createFakeApi();
  const store = createStore(api);
  return { api, store };
}

describe('projectSlice', () => {
  it('fetch: idle → loading → succeeded', async () => {
    const { api, store } = setup();
    const pending = deferred<ProjectDetail>();
    api.projects.get.mockReturnValue(pending.promise);

    const promise = store.dispatch(fetchProject('p1'));
    expect(selectProjectStatus(store.getState())).toBe('loading');
    pending.resolve(detail('p1'));
    await promise;

    expect(selectProjectStatus(store.getState())).toBe('succeeded');
    expect(selectProjectDetail(store.getState())?.project.id).toBe('p1');
  });

  it('fetch: 404 → failed со статусом', async () => {
    const { api, store } = setup();
    api.projects.get.mockRejectedValue(serverError(404, 'Проект не найден'));
    await store.dispatch(fetchProject('nope'));
    expect(selectProjectStatus(store.getState())).toBe('failed');
    expect(store.getState().project.error).toMatchObject({ status: 404 });
  });

  it('при переходе на другой проект старые данные скрываются', async () => {
    const { api, store } = setup();
    api.projects.get.mockResolvedValueOnce(detail('p1'));
    await store.dispatch(fetchProject('p1'));

    api.projects.get.mockReturnValue(new Promise(() => undefined));
    void store.dispatch(fetchProject('p2'));
    expect(selectProjectDetail(store.getState())).toBeNull();
  });

  it('при повторной загрузке того же проекта данные остаются на экране', async () => {
    const { api, store } = setup();
    api.projects.get.mockResolvedValueOnce(detail('p1'));
    await store.dispatch(fetchProject('p1'));
    api.projects.get.mockReturnValue(new Promise(() => undefined));
    void store.dispatch(fetchProject('p1'));
    expect(selectProjectDetail(store.getState())?.project.id).toBe('p1');
  });

  it('гонка: ответ на устаревший запрос игнорируется', async () => {
    const { api, store } = setup();
    const slow = deferred<ProjectDetail>();
    api.projects.get.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(detail('p2'));

    const first = store.dispatch(fetchProject('p1'));
    await store.dispatch(fetchProject('p2'));
    slow.resolve(detail('p1'));
    await first;

    expect(selectProjectDetail(store.getState())?.project.id).toBe('p2');
  });

  it('updateProject обновляет открытый проект', async () => {
    const { api, store } = setup();
    api.projects.get.mockResolvedValue(detail('p1'));
    await store.dispatch(fetchProject('p1'));
    api.projects.update.mockResolvedValue(project('p1', 'Новое имя'));
    await store.dispatch(updateProject({ id: 'p1', patch: { title: 'Новое имя' } }));
    expect(selectProjectDetail(store.getState())?.project.title).toBe('Новое имя');
  });

  it('updateProject другого проекта не подменяет открытый', async () => {
    const { api, store } = setup();
    api.projects.get.mockResolvedValue(detail('p1'));
    await store.dispatch(fetchProject('p1'));
    api.projects.update.mockResolvedValue(project('p9', 'Чужой'));
    await store.dispatch(updateProject({ id: 'p9', patch: { title: 'Чужой' } }));
    expect(selectProjectDetail(store.getState())?.project.title).toBe('p1');
  });

  it('inviteMember заменяет список участников', async () => {
    const { api, store } = setup();
    api.projects.get.mockResolvedValue(detail('p1'));
    await store.dispatch(fetchProject('p1'));
    const members = [
      { userId: 'u1', name: 'Алекс', email: 'a@b.ru', role: 'owner' as const },
      { userId: 'u2', name: 'Лера', email: 'l@b.ru', role: 'artist' as const },
    ];
    api.projects.invite.mockResolvedValue(members);
    await store.dispatch(inviteMember({ id: 'p1', email: 'l@b.ru' }));
    expect(selectProjectDetail(store.getState())?.members).toEqual(members);
  });

  it('uploadVersion добавляет версию в конец', async () => {
    const { api, store } = setup();
    api.projects.get.mockResolvedValue(detail('p1'));
    await store.dispatch(fetchProject('p1'));
    api.versions.create.mockResolvedValue(version('p1', 2));
    await store.dispatch(
      uploadVersion({
        projectId: 'p1',
        input: {
          file: new Blob(['x']),
          fileName: 'a.mp3',
          note: '',
          analysis: { durationSec: 1, peaks: [], lufs: -14, peakDb: -1 },
        },
      }),
    );
    expect(selectProjectDetail(store.getState())?.versions.map((v) => v.number)).toEqual([1, 2]);
  });

  it('deleteProject очищает открытый проект', async () => {
    const { api, store } = setup();
    api.projects.get.mockResolvedValue(detail('p1'));
    api.projects.remove.mockResolvedValue(undefined);
    await store.dispatch(fetchProject('p1'));
    await store.dispatch(deleteProject('p1'));
    expect(selectProjectDetail(store.getState())).toBeNull();
    expect(selectProjectStatus(store.getState())).toBe('idle');
  });
});
