import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { SerializedError } from '../../lib/errors';
import type { ProjectInput } from '../../lib/schemas';
import type { NewVersionInput } from '../../api/types';
import type { ProjectDetail } from '../../types/domain';
import type { RootState } from '../../app/store';

export const fetchProject = apiThunk('project/fetch', (id: string, { api }) =>
  api.projects.get(id),
);

export const createProject = apiThunk(
  'project/create',
  (input: Omit<ProjectInput, 'status'>, { api }) => api.projects.create(input),
);

export const updateProject = apiThunk(
  'project/update',
  (arg: { id: string; patch: Partial<ProjectInput> }, { api }) =>
    api.projects.update(arg.id, arg.patch),
);

export const deleteProject = apiThunk('project/delete', async (id: string, { api }) => {
  await api.projects.remove(id);
  return id;
});

export const inviteMember = apiThunk(
  'project/invite',
  (arg: { id: string; email: string }, { api }) => api.projects.invite(arg.id, arg.email),
);

export const uploadVersion = apiThunk(
  'project/uploadVersion',
  (arg: { projectId: string; input: NewVersionInput }, { api }) =>
    api.versions.create(arg.projectId, arg.input),
);

export interface ProjectState {
  detail: ProjectDetail | null;
  status: LoadStatus;
  error: SerializedError | null;
  /** id последнего запроса: ответы на устаревшие запросы игнорируются. */
  currentRequestId: string | null;
}

const initialState: ProjectState = {
  detail: null,
  status: 'idle',
  error: null,
  currentRequestId: null,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProject.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
        // Другой проект — не показываем чужие данные, пока грузится новый.
        if (state.detail?.project.id !== action.meta.arg) state.detail = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchProject.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      })
      .addCase(updateProject.fulfilled, (state, { payload }) => {
        if (state.detail?.project.id === payload.id) state.detail.project = payload;
      })
      .addCase(inviteMember.fulfilled, (state, { payload }) => {
        if (state.detail) state.detail.members = payload;
      })
      .addCase(uploadVersion.fulfilled, (state, { payload }) => {
        if (state.detail?.project.id === payload.projectId) {
          state.detail.versions.push(payload);
        }
      })
      .addCase(deleteProject.fulfilled, (state, { payload }) => {
        if (state.detail?.project.id === payload) {
          state.detail = null;
          state.status = 'idle';
        }
      });
  },
});

export default projectSlice.reducer;

export const selectProjectDetail = (state: RootState) => state.project.detail;
export const selectProjectStatus = (state: RootState) => state.project.status;
export const selectProjectError = (state: RootState) => state.project.error;
