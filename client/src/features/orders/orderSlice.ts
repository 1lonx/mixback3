import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { RootState } from '../../app/store';
import type { SerializedError } from '../../lib/errors';
import type { OrderInput, ReviewInput } from '../../lib/schemas';
import type { OrderAction, OrderDetail } from '../../types/domain';

export const createOrder = apiThunk('order/create', (input: OrderInput, { api }) =>
  api.orders.create(input),
);

export const fetchOrder = apiThunk('order/fetch', (id: string, { api }) => api.orders.get(id));

export const actOnOrder = apiThunk(
  'order/act',
  (arg: { id: string; action: OrderAction }, { api }) => api.orders.act(arg.id, arg.action),
);

export const submitReview = apiThunk(
  'order/review',
  (arg: { orderId: string; input: ReviewInput }, { api }) =>
    api.orders.review(arg.orderId, arg.input),
);

export interface OrderState {
  detail: OrderDetail | null;
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
}

const initialState: OrderState = {
  detail: null,
  status: 'idle',
  error: null,
  currentRequestId: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrder.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
        if (state.detail?.id !== action.meta.arg) state.detail = null;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      })
      .addCase(actOnOrder.fulfilled, (state, { payload }) => {
        if (state.detail?.id === payload.id) state.detail = payload;
      })
      .addCase(submitReview.fulfilled, (state, { payload }) => {
        if (state.detail?.id === payload.orderId) {
          state.detail = { ...state.detail, reviewed: true, review: payload };
        }
      });
  },
});

export default orderSlice.reducer;

export const selectOrderDetail = (state: RootState) => state.order.detail;
export const selectOrderStatus = (state: RootState) => state.order.status;
export const selectOrderError = (state: RootState) => state.order.error;
