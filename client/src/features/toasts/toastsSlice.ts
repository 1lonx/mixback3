import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

const toastsSlice = createSlice({
  name: 'toasts',
  initialState: [] as Toast[],
  reducers: {
    pushToast: {
      reducer: (state, action: PayloadAction<Toast>) => {
        state.push(action.payload);
        if (state.length > 4) state.shift();
      },
      prepare: (kind: ToastKind, message: string) => ({
        payload: { id: nanoid(), kind, message },
      }),
    },
    dismissToast: (state, action: PayloadAction<string>) =>
      state.filter((toast) => toast.id !== action.payload),
  },
});

export const { pushToast, dismissToast } = toastsSlice.actions;
export default toastsSlice.reducer;

export const selectToasts = (state: RootState) => state.toasts;
