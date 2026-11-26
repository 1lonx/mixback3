import { createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { SerializedError } from '../../lib/errors';
import type { CommentInput } from '../../lib/schemas';
import type { Comment } from '../../types/domain';
import type { RootState } from '../../app/store';

export const fetchComments = apiThunk('comments/fetch', (versionId: string, { api }) =>
  api.comments.list(versionId),
);

export const addComment = apiThunk(
  'comments/add',
  (arg: { versionId: string; input: CommentInput }, { api }) =>
    api.comments.create(arg.versionId, arg.input),
);

export const updateComment = apiThunk(
  'comments/update',
  (arg: { id: string; patch: Partial<Pick<Comment, 'text' | 'resolved'>> }, { api }) =>
    api.comments.update(arg.id, arg.patch),
);

export const removeComment = apiThunk('comments/remove', async (id: string, { api }) => {
  await api.comments.remove(id);
  return id;
});

const adapter = createEntityAdapter<Comment>({
  sortComparer: (a, b) => a.timeSec - b.timeSec || a.createdAt.localeCompare(b.createdAt),
});

export interface CommentsState {
  versionId: string | null;
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
}

const commentsSlice = createSlice({
  name: 'comments',
  initialState: adapter.getInitialState<CommentsState>({
    versionId: null,
    status: 'idle',
    error: null,
    currentRequestId: null,
  }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchComments.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
        if (state.versionId !== action.meta.arg) {
          adapter.removeAll(state);
          state.versionId = action.meta.arg;
        }
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        adapter.setAll(state, action.payload);
      })
      .addCase(fetchComments.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      })
      .addCase(addComment.fulfilled, (state, { payload }) => {
        if (payload.versionId === state.versionId) adapter.addOne(state, payload);
      })
      .addCase(removeComment.fulfilled, (state, { payload }) => {
        adapter.removeOne(state, payload);
      })
      .addCase(updateComment.pending, (state, { meta }) => {
        const { id, patch } = meta.arg;
        if (patch.resolved !== undefined)
          adapter.updateOne(state, { id, changes: { resolved: patch.resolved } });
      })
      .addCase(updateComment.fulfilled, (state, { payload }) => {
        adapter.upsertOne(state, payload);
      })
      .addCase(updateComment.rejected, (state, { meta }) => {
        const { id, patch } = meta.arg;
        if (patch.resolved !== undefined)
          adapter.updateOne(state, { id, changes: { resolved: !patch.resolved } });
      });
  },
});

export default commentsSlice.reducer;

export const { selectAll: selectAllComments } = adapter.getSelectors(
  (state: RootState) => state.comments,
);

export type CommentFilter = 'all' | 'open' | 'resolved';

export const selectCommentsStatus = (state: RootState) => state.comments.status;
export const selectCommentsError = (state: RootState) => state.comments.error;

export const selectFilteredComments = createSelector(
  [selectAllComments, (_: RootState, filter: CommentFilter) => filter],
  (comments, filter) =>
    filter === 'all' ? comments : comments.filter((c) => c.resolved === (filter === 'resolved')),
);

export const selectOpenCommentsCount = createSelector(
  [selectAllComments],
  (comments) => comments.filter((c) => !c.resolved).length,
);
