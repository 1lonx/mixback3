import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'mixback:theme';
const listeners = new Set<() => void>();

export function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function systemMedia(): MediaQueryList | null {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemMedia()?.matches ? 'light' : 'dark';
  return preference;
}

/** Применяет тему к <html> и сообщает подписчикам (плеер перекрашивает волну). */
export function applyTheme(preference: ThemePreference): void {
  document.documentElement.setAttribute('data-theme', resolveTheme(preference));
  listeners.forEach((listener) => listener());
}

export function setPreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, preference);
  } catch {
    // Хранилище недоступно — тема просто не запомнится.
  }
  applyTheme(preference);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Пока выбран «как в системе», следим за переключением темы в ОС.
  const media = systemMedia();
  const onSystemChange = () => {
    if (readPreference() === 'system') applyTheme('system');
  };
  media?.addEventListener('change', onSystemChange);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener('change', onSystemChange);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => 'system');
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'),
    () => 'dark',
  );
}

/** Читает цвет из CSS-переменной текущей темы (canvas не понимает var()). */
export function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
