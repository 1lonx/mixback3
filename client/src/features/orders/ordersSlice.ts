import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../app/createThunk';
import { errorFrom, type LoadStatus } from '../../app/status';
import type { RootState } from '../../app/store';
import type { SerializedError } from '../../lib/errors';
import type { OrdersQuery, OrderView } from '../../types/domain';

export const fetchOrders = apiThunk('orders/fetch', (query: OrdersQuery, { api }) =>
  api.orders.list(query),
);

const adapter = createEntityAdapter<OrderView>();

export interface OrdersState {
  status: LoadStatus;
  error: SerializedError | null;
  currentRequestId: string | null;
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState: adapter.getInitialState<OrdersState>({
    status: 'idle',
    error: null,
    currentRequestId: null,
  }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        adapter.setAll(state, action.payload);
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.error = errorFrom(action);
      });
  },
});

export default ordersSlice.reducer;

export const { selectAll: selectAllOrders } = adapter.getSelectors(
  (state: RootState) => state.orders,
);
export const selectOrdersStatus = (state: RootState) => state.orders.status;
export const selectOrdersError = (state: RootState) => state.orders.error;
