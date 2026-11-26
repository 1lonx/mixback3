import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { RootState } from '../../app/store';
import type { SerializedError } from '../../lib/errors';
import type { Profile } from '../../types/domain';
import { updateProfile } from '../auth/authSlice';

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- идиома RTK: вызов без аргумента
export const fetchProfile = apiThunk('profile/fetch', (_: void, { api }) => api.auth.profile());

export interface ProfileState {
  data: Profile | null;
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
}

const initialState: ProfileState = {
  data: null,
  status: 'idle',
  error: null,
  currentRequestId: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      })
      .addCase(updateProfile.fulfilled, (state, { payload }) => {
        if (state.data) state.data.user = payload;
      });
  },
});

export default profileSlice.reducer;

export const selectProfile = (state: RootState) => state.profile.data;
export const selectProfileStatus = (state: RootState) => state.profile.status;
export const selectProfileError = (state: RootState) => state.profile.error;
