import { createSlice } from '@reduxjs/toolkit';
import type { NewTrackInput } from '../../api/types';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { RootState } from '../../app/store';
import type { SerializedError } from '../../lib/errors';
import type { EngineerInput } from '../../lib/schemas';
import type { MyEngineer } from '../../types/domain';

// `void` — идиома RTK: thunk без аргумента.
/* eslint-disable @typescript-eslint/no-invalid-void-type */
export const fetchMyEngineer = apiThunk('mine/fetch', (_: void, { api }) => api.engineers.mine());
/* eslint-enable @typescript-eslint/no-invalid-void-type */

export const saveEngineer = apiThunk('mine/save', (input: EngineerInput, { api }) =>
  api.engineers.save(input),
);

export const setCover = apiThunk('mine/setCover', (image: Blob | null, { api }) =>
  api.engineers.setCover(image),
);

export const addTrack = apiThunk('mine/addTrack', (input: NewTrackInput, { api }) =>
  api.engineers.addTrack(input),
);

export const removeTrack = apiThunk('mine/removeTrack', async (id: string, { api }) => {
  await api.engineers.removeTrack(id);
  return id;
});

export interface MineState {
  /** null после загрузки — пользователь ещё не заполнял анкету. */
  data: MyEngineer | null;
  status: LoadStatus;
  error: SerializedError | null;
}

const initialState: MineState = { data: null, status: 'idle', error: null };

const mineSlice = createSlice({
  name: 'mine',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyEngineer.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyEngineer.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        state.data = payload;
      })
      .addCase(fetchMyEngineer.rejected, (state, action) => {
        state.status = 'failed';
        state.error = errorFrom(action);
      })
      .addCase(saveEngineer.fulfilled, (state, { payload }) => {
        state.data = { profile: payload, portfolio: state.data?.portfolio ?? [] };
      })
      .addCase(setCover.fulfilled, (state, { payload }) => {
        if (state.data) state.data.profile = payload;
      })
      .addCase(addTrack.fulfilled, (state, { payload }) => {
        state.data?.portfolio.push(payload);
      })
      .addCase(removeTrack.fulfilled, (state, { payload }) => {
        if (state.data) state.data.portfolio = state.data.portfolio.filter((t) => t.id !== payload);
      });
  },
});

export default mineSlice.reducer;

export const selectMine = (state: RootState) => state.mine.data;
export const selectMineStatus = (state: RootState) => state.mine.status;
export const selectMineError = (state: RootState) => state.mine.error;
