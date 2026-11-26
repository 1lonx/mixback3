/**
 * Очистка пользовательского текста. React уже экранирует HTML (в проекте нет
 * dangerouslySetInnerHTML), поэтому здесь закрываем другое:
 *  - управляющие символы (кроме перевода строки и табуляции);
 *  - символы смены направления текста (U+202A–202E, U+2066–2069): через них подделывают
 *    отображение имён и текста («Trojan Source»);
 *  - невидимые символы нулевой ширины, позволяющие создать двойников имени.
 */
// Диапазоны собраны из кодов, а не вписаны символами: так их не спутать с обычными пробелами.
const DANGEROUS_RANGES: [number, number][] = [
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x7f],
  [0x200b, 0x200f], // нулевой ширины, метки направления
  [0x202a, 0x202e], // embedding/override
  [0x2060, 0x2064],
  [0x2066, 0x2069], // isolate
  [0xfeff, 0xfeff], // BOM
];

const isDangerous = (char: string) => {
  const code = char.codePointAt(0) ?? 0;
  return DANGEROUS_RANGES.some(([from, to]) => code >= from && code <= to);
};

export function cleanText(input: string): string {
  return Array.from(input.normalize('NFC'))
    .filter((char) => !isDangerous(char))
    .join('');
}

/** Допустимый внутренний путь для редиректа: только «/что-то», без протокола и «//host». */
export function safeInternalPath(path: string | undefined, fallback = '/projects'): string {
  if (!path) return fallback;
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F]/.test(path)) return fallback;
  return path;
}
