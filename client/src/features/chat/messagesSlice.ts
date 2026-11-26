import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { RootState } from '../../app/store';
import type { SerializedError } from '../../lib/errors';
import type { MessageInput } from '../../lib/schemas';
import type { Message } from '../../types/domain';

export const fetchMessages = apiThunk('messages/fetch', (orderId: string, { api }) =>
  api.messages.list(orderId),
);

export const sendMessage = apiThunk(
  'messages/send',
  (arg: { orderId: string; input: MessageInput }, { api }) =>
    api.messages.send(arg.orderId, arg.input),
);

export interface MessagesState {
  orderId: string | null;
  items: Message[];
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
}

const initialState: MessagesState = {
  orderId: null,
  items: [],
  status: 'idle',
  error: null,
  currentRequestId: null,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        state.currentRequestId = action.meta.requestId;
        state.error = null;
        if (state.orderId !== action.meta.arg) {
          state.orderId = action.meta.arg;
          state.items = [];
          state.status = 'loading';
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = state.items.length > 0 ? 'succeeded' : 'failed';
        state.error = errorFrom(action);
      })
      .addCase(sendMessage.fulfilled, (state, { payload }) => {
        if (state.orderId === payload.orderId && !state.items.some((m) => m.id === payload.id)) {
          state.items.push(payload);
        }
      });
  },
});

export default messagesSlice.reducer;

export const selectMessages = (state: RootState) => state.messages.items;
export const selectMessagesStatus = (state: RootState) => state.messages.status;
export const selectMessagesError = (state: RootState) => state.messages.error;
