/** Минимальный интерфейс, совместимый с window.localStorage. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/**
 * localStorage может бросать исключения (приватный режим, запрет cookies, переполнение).
 * Оборачиваем его, чтобы приложение деградировало до работы в памяти, а не падало.
 */
export function createBrowserStorage(): KeyValueStore {
  const fallback = createMemoryStorage();
  let usable = true;
  try {
    const probe = '__mixback_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
  } catch {
    usable = false;
  }
  return usable ? window.localStorage : fallback;
}
