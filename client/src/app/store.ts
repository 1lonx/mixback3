import {
  combineReducers,
  configureStore,
  type Reducer,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { MixbackApi } from '../api/types';
import authReducer, { deleteAccount, logout } from '../features/auth/authSlice';
import messagesReducer from '../features/chat/messagesSlice';
import checklistReducer from '../features/checklist/checklistSlice';
import commentsReducer from '../features/comments/commentsSlice';
import catalogReducer from '../features/engineers/catalogSlice';
import engineerReducer from '../features/engineers/engineerSlice';
import mineReducer from '../features/engineers/mineSlice';
import orderReducer from '../features/orders/orderSlice';
import ordersReducer from '../features/orders/ordersSlice';
import profileReducer from '../features/profile/profileSlice';
import projectReducer from '../features/project/projectSlice';
import projectsReducer from '../features/projects/projectsSlice';
import toastsReducer from '../features/toasts/toastsSlice';

const appReducer = combineReducers({
  auth: authReducer,
  projects: projectsReducer,
  project: projectReducer,
  comments: commentsReducer,
  checklist: checklistReducer,
  profile: profileReducer,
  catalog: catalogReducer,
  engineer: engineerReducer,
  mine: mineReducer,
  orders: ordersReducer,
  order: orderReducer,
  messages: messagesReducer,
  toasts: toastsReducer,
});

const rootReducer: Reducer<RootState, UnknownAction, Partial<RootState>> = (state, action) =>
  logout.pending.match(action) || deleteAccount.fulfilled.match(action)
    ? appReducer(undefined, action)
    : appReducer(state, action);

export function createStore(api: MixbackApi, preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault({ thunk: { extraArgument: { api } } }),
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<typeof appReducer>;
export type AppDispatch = AppStore['dispatch'];
