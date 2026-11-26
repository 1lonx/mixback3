import type { KeyValueStore } from './storage';

/** Настройки имитации сети: позволяют показать состояния загрузки и ошибки без сервера. */
export interface MockSettings {
  latencyMs: number;
  failNetwork: boolean;
}

export interface MockControls {
  get(): MockSettings;
  set(patch: Partial<MockSettings>): void;
}

const KEY = 'mixback:mock';

function isSettings(value: unknown): value is Partial<MockSettings> {
  return typeof value === 'object' && value !== null;
}

export function createMockControls(
  storage: KeyValueStore,
  defaults: MockSettings = { latencyMs: 0, failNetwork: false },
): MockControls {
  const read = (): MockSettings => {
    try {
      const raw = storage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (!isSettings(parsed)) return defaults;
      return {
        latencyMs: typeof parsed.latencyMs === 'number' ? parsed.latencyMs : defaults.latencyMs,
        failNetwork:
          typeof parsed.failNetwork === 'boolean' ? parsed.failNetwork : defaults.failNetwork,
      };
    } catch {
      return defaults;
    }
  };

  return {
    get: read,
    set(patch) {
      storage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
    },
  };
}
