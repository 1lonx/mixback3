const DANGEROUS_RANGES: [number, number][] = [
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x7f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
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

export function safeInternalPath(path: string | undefined, fallback = '/projects'): string {
  if (!path) return fallback;
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F]/.test(path)) return fallback;
  return path;
}
