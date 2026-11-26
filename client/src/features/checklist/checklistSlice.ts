import { createSelector, createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { SerializedError } from '../../lib/errors';
import type { Checklist } from '../../types/domain';
import type { RootState } from '../../app/store';

export const fetchChecklist = apiThunk('checklist/fetch', (versionId: string, { api }) =>
  api.checklist.get(versionId),
);

export const generateChecklist = apiThunk('checklist/generate', (versionId: string, { api }) =>
  api.checklist.generate(versionId),
);

export const toggleChecklistItem = apiThunk(
  'checklist/toggle',
  (arg: { versionId: string; itemId: string; done: boolean }, { api }) =>
    api.checklist.toggle(arg.versionId, arg.itemId, arg.done),
);

export interface ChecklistEntry {
  status: LoadStatus;
  error: SerializedError | null;
  data: Checklist | null;
}

export interface ChecklistState {
  byVersion: Record<string, ChecklistEntry>;
}

const initialState: ChecklistState = { byVersion: {} };

const emptyEntry = (): ChecklistEntry => ({ status: 'idle', error: null, data: null });

function entryOf(state: ChecklistState, versionId: string): ChecklistEntry {
  state.byVersion[versionId] ??= emptyEntry();
  return state.byVersion[versionId];
}

const checklistSlice = createSlice({
  name: 'checklist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    for (const thunk of [fetchChecklist, generateChecklist]) {
      builder
        .addCase(thunk.pending, (state, { meta }) => {
          const entry = entryOf(state, meta.arg);
          entry.status = 'loading';
          entry.error = null;
        })
        .addCase(thunk.fulfilled, (state, { meta, payload }) => {
          const entry = entryOf(state, meta.arg);
          entry.status = 'succeeded';
          entry.data = payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          const entry = entryOf(state, action.meta.arg);
          entry.status = 'failed';
          entry.error = errorFrom(action);
        });
    }

    builder
      .addCase(toggleChecklistItem.pending, (state, { meta }) => {
        const item = state.byVersion[meta.arg.versionId]?.data?.items.find(
          (i) => i.id === meta.arg.itemId,
        );
        if (item) item.done = meta.arg.done;
      })
      .addCase(toggleChecklistItem.rejected, (state, { meta }) => {
        const item = state.byVersion[meta.arg.versionId]?.data?.items.find(
          (i) => i.id === meta.arg.itemId,
        );
        if (item) item.done = !meta.arg.done;
      });
  },
});

export default checklistSlice.reducer;

const selectByVersion = (state: RootState) => state.checklist.byVersion;

const EMPTY_ENTRY: ChecklistEntry = emptyEntry();

export const selectChecklistEntry = (state: RootState, versionId: string): ChecklistEntry =>
  selectByVersion(state)[versionId] ?? EMPTY_ENTRY;

export const selectChecklistProgress = createSelector([selectChecklistEntry], (entry) => {
  const items = entry.data?.items ?? [];
  return { done: items.filter((i) => i.done).length, total: items.length };
});
