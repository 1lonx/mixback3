import { setPreference, useThemePreference, type ThemePreference } from '../../lib/theme';
import styles from './ThemeToggle.module.css';

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'как в системе',
  light: 'светлая',
  dark: 'тёмная',
};

function Icon({ preference }: { preference: ThemePreference }) {
  if (preference === 'light') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    );
  }
  if (preference === 'dark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </svg>
  );
}

/** Циклически переключает тему: система → светлая → тёмная. */
export function ThemeToggle() {
  const preference = useThemePreference();
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => {
        setPreference(NEXT[preference]);
      }}
      aria-label={`Тема: ${THEME_LABELS[preference]}. Переключить на: ${THEME_LABELS[NEXT[preference]]}`}
      title={`Тема: ${THEME_LABELS[preference]}`}
    >
      <Icon preference={preference} />
    </button>
  );
}
