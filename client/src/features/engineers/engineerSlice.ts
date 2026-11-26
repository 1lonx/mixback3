import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { RootState } from '../../app/store';
import type { SerializedError } from '../../lib/errors';
import type { EngineerDetail, Review } from '../../types/domain';
import { submitReview } from '../orders/orderSlice';

export const fetchEngineer = apiThunk('engineer/fetch', (userId: string, { api }) =>
  api.engineers.get(userId),
);

export interface EngineerState {
  detail: EngineerDetail | null;
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
}

const initialState: EngineerState = {
  detail: null,
  status: 'idle',
  error: null,
  currentRequestId: null,
};

/** Пересчёт рейтинга после нового отзыва: ровно так же считает сервер. */
function withReview(detail: EngineerDetail, review: Review): EngineerDetail {
  const reviews = [review, ...detail.reviews];
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return {
    ...detail,
    reviews,
    reviewsCount: reviews.length,
    rating: Math.round(average * 10) / 10,
  };
}

const engineerSlice = createSlice({
  name: 'engineer',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEngineer.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
        // Другой звукорежиссёр — не показываем чужой профиль, пока грузится новый.
        if (state.detail?.userId !== action.meta.arg) state.detail = null;
      })
      .addCase(fetchEngineer.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchEngineer.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      })
      .addCase(submitReview.fulfilled, (state, { payload }) => {
        if (state.detail?.userId === payload.engineerId) {
          state.detail = withReview(state.detail, payload);
        }
      });
  },
});

export default engineerSlice.reducer;

export const selectEngineerDetail = (state: RootState) => state.engineer.detail;
export const selectEngineerStatus = (state: RootState) => state.engineer.status;
export const selectEngineerError = (state: RootState) => state.engineer.error;
