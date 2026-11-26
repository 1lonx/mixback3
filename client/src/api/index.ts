import { createIndexedDbBlobStore } from './local/blobStore';
import { createLocalApi } from './local/createLocalApi';
import { createMockControls, type MockControls } from './local/mockControls';
import { createBrowserStorage, type KeyValueStore } from './local/storage';
import { DB_KEY } from './local/db';
import type { MixbackApi } from './types';

export type { MixbackApi } from './types';

export interface AppApi {
  api: MixbackApi;
  controls: MockControls;
  storage: KeyValueStore;
}

export function createAppApi(): AppApi {
  const storage = createBrowserStorage();
  const defaultLatency = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 350);
  const controls = createMockControls(storage, {
    latencyMs: Number.isFinite(defaultLatency) ? defaultLatency : 350,
    failNetwork: false,
  });
  const api = createLocalApi({
    storage,
    blobs: createIndexedDbBlobStore(),
    controls,
    assetBase: import.meta.env.BASE_URL,
  });
  return { api, controls, storage };
}

export function resetDemoData(storage: KeyValueStore): void {
  storage.removeItem(DB_KEY);
}
