/** 82 → «1:22», 3725 → «1:02:05» */
export function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Обратное преобразование: «1:22» → 82. Возвращает null, если формат неверный. */
export function parseTime(input: string): number | null {
  const match = /^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)$/.exec(input.trim());
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s);
}

export function formatLufs(lufs: number): string {
  return `${lufs.toFixed(1).replace('-', '−')} LUFS`;
}

export function formatDb(db: number): string {
  return `${db.toFixed(1).replace('-', '−')} dB`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const PLURALS = new Intl.PluralRules('ru-RU');

/** pluralize(2, ['версия', 'версии', 'версий']) → «2 версии» */
export function pluralize(count: number, forms: readonly [string, string, string]): string {
  const rule = PLURALS.select(count);
  const form = rule === 'one' ? forms[0] : rule === 'few' ? forms[1] : forms[2];
  return `${count} ${form}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
