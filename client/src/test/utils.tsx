import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';
import type { AppApi } from '../api';
import { createMemoryBlobStore } from '../api/local/blobStore';
import { createLocalApi } from '../api/local/createLocalApi';
import { createMockControls } from '../api/local/mockControls';
import { createMemoryStorage } from '../api/local/storage';
import { ApiProvider } from '../app/ApiProvider';
import { appRoutes } from '../app/router';
import { createStore } from '../app/store';
import { DEMO_ARTIST, DEMO_OWNER, DEMO_PASSWORD } from '../lib/demoAccounts';
import { restoreSession } from '../features/auth/authSlice';

export const FIXED_NOW = new Date('2026-11-01T12:00:00.000Z');

export type TestApi = AppApi & { advanceTime: (ms: number) => void };

export function createTestApi(): TestApi {
  const storage = createMemoryStorage();
  const controls = createMockControls(storage, { latencyMs: 0, failNetwork: false });
  let counter = 0;
  let current = FIXED_NOW.getTime();
  const api = createLocalApi({
    storage,
    blobs: createMemoryBlobStore(),
    controls,
    now: () => new Date(current),
    newId: (prefix) => `${prefix}_t${++counter}`,
    sleep: () => Promise.resolve(),
  });
  return {
    api,
    controls,
    storage,
    advanceTime: (ms) => {
      current += ms;
    },
  };
}

export async function loginAs(appApi: AppApi, who: 'owner' | 'artist' = 'owner') {
  const account = who === 'owner' ? DEMO_OWNER : DEMO_ARTIST;
  await appApi.api.auth.login({ email: account.email, password: DEMO_PASSWORD });
}

interface RenderOptions {
  appApi?: AppApi;
  route?: string;
  as?: 'owner' | 'artist';
  routes?: RouteObject[];
}

export async function renderApp({
  appApi = createTestApi(),
  route = '/',
  as,
  routes,
}: RenderOptions = {}) {
  if (as) await loginAs(appApi, as);
  const store = createStore(appApi.api);
  if (as) await store.dispatch(restoreSession());
  const router = createMemoryRouter(routes ?? appRoutes, { initialEntries: [route] });

  const result = render(
    <ApiProvider value={appApi}>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </ApiProvider>,
  );
  return { ...result, store, router, appApi };
}

export async function renderWithStore(
  ui: ReactElement,
  options: Omit<RenderOptions, 'route' | 'routes'> = {},
) {
  const appApi = options.appApi ?? createTestApi();
  if (options.as) await loginAs(appApi, options.as);
  const store = createStore(appApi.api);
  if (options.as) await store.dispatch(restoreSession());
  const result = render(
    <ApiProvider value={appApi}>
      <Provider store={store}>{ui}</Provider>
    </ApiProvider>,
  );
  return { ...result, store, appApi };
}
