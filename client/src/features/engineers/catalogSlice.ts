import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { RootState } from '../../app/store';
import type { SerializedError } from '../../lib/errors';
import type { EngineersQuery, EngineerSummary } from '../../types/domain';

export const fetchEngineers = apiThunk('catalog/fetch', (query: EngineersQuery, { api }) =>
  api.engineers.list(query),
);

/* eslint-disable @typescript-eslint/no-invalid-void-type */
export const fetchPublishedCount = apiThunk('catalog/count', (_: void, { api }) =>
  api.engineers.count(),
);
/* eslint-enable @typescript-eslint/no-invalid-void-type */

const adapter = createEntityAdapter<EngineerSummary, string>({ selectId: (e) => e.userId });

export interface CatalogState {
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
  publishedCount: number | null;
}

const catalogSlice = createSlice({
  name: 'catalog',
  initialState: adapter.getInitialState<CatalogState>({
    status: 'idle',
    error: null,
    currentRequestId: null,
    publishedCount: null,
  }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEngineers.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchEngineers.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        adapter.setAll(state, action.payload);
      })
      .addCase(fetchPublishedCount.fulfilled, (state, action) => {
        state.publishedCount = action.payload;
      })
      .addCase(fetchEngineers.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      });
  },
});

export default catalogSlice.reducer;

export const { selectAll: selectAllEngineers } = adapter.getSelectors(
  (state: RootState) => state.catalog,
);
export const selectCatalogStatus = (state: RootState) => state.catalog.status;
export const selectPublishedCount = (state: RootState) => state.catalog.publishedCount;
export const selectCatalogError = (state: RootState) => state.catalog.error;
