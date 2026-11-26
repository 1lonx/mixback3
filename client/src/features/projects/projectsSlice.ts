import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { SerializedError } from '../../lib/errors';
import type { ProjectsQuery, ProjectSummary } from '../../types/domain';
import type { RootState } from '../../app/store';
import { deleteProject } from '../project/projectSlice';

export const fetchProjects = apiThunk('projects/fetch', (query: ProjectsQuery, { api }) =>
  api.projects.list(query),
);

const adapter = createEntityAdapter<ProjectSummary>();

export interface ProjectsState {
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
  loadedQuery: ProjectsQuery | null;
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState: adapter.getInitialState<ProjectsState>({
    status: 'idle',
    error: null,
    currentRequestId: null,
    loadedQuery: null,
  }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.loadedQuery = action.meta.arg;
        adapter.setAll(state, action.payload);
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      })
      .addCase(deleteProject.fulfilled, (state, { payload }) => {
        adapter.removeOne(state, payload);
      });
  },
});

export default projectsSlice.reducer;

export const { selectAll: selectAllProjects, selectTotal: selectProjectsTotal } =
  adapter.getSelectors((state: RootState) => state.projects);

export const selectProjectsStatus = (state: RootState) => state.projects.status;
export const selectProjectsError = (state: RootState) => state.projects.error;
export const selectLoadedQuery = (state: RootState) => state.projects.loadedQuery;
