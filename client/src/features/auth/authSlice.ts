import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { SerializedError } from '../../lib/errors';
import type { LoginInput, RegisterInput } from '../../lib/schemas';
import type { User } from '../../types/domain';
import type { RootState } from '../../app/store';

/* eslint-disable @typescript-eslint/no-invalid-void-type */
export const restoreSession = apiThunk('auth/restoreSession', (_: void, { api }) => api.auth.me());

export const login = apiThunk('auth/login', async (input: LoginInput, { api }) => {
  const session = await api.auth.login(input);
  return session.user;
});

export const register = apiThunk('auth/register', async (input: RegisterInput, { api }) => {
  const session = await api.auth.register(input);
  return session.user;
});

export const logout = apiThunk('auth/logout', (_: void, { api }) => api.auth.logout());
/* eslint-enable @typescript-eslint/no-invalid-void-type */

export const updateProfile = apiThunk('auth/updateProfile', (input: { name: string }, { api }) =>
  api.auth.updateProfile(input),
);

export const changePassword = apiThunk(
  'auth/changePassword',
  async (input: { currentPassword: string; newPassword: string }, { api }) => {
    const session = await api.auth.changePassword(input);
    return session.user;
  },
);

export const deleteAccount = apiThunk(
  'auth/deleteAccount',
  (input: { password: string }, { api }) => api.auth.deleteAccount(input),
);

export interface AuthState {
  user: User | null;
  initialized: boolean;
  sessionError: SerializedError | null;
  status: LoadStatus;
  error: SerializedError | null;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
  sessionError: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.sessionError = null;
      })
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        state.user = payload;
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.user = null;
        state.initialized = true;
        state.sessionError = errorFrom(action);
      });

    for (const thunk of [login, register]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = 'loading';
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, { payload }) => {
          state.status = 'succeeded';
          state.user = payload;
          state.initialized = true;
          state.sessionError = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.status = 'failed';
          state.error = errorFrom(action);
        });
    }

    builder.addCase(updateProfile.fulfilled, (state, { payload }) => {
      state.user = payload;
    });

    builder.addCase(logout.pending, (state) => {
      state.user = null;
      state.status = 'idle';
      state.error = null;
    });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (state: RootState) => state.auth.user;
export const selectAuthInitialized = (state: RootState) => state.auth.initialized;
export const selectSessionError = (state: RootState) => state.auth.sessionError;
