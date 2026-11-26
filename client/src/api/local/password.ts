const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export function randomHex(byteLength = 16): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export const PBKDF2_ITERATIONS = 100_000;

/**
 * Хеш пароля: PBKDF2-HMAC-SHA256 с индивидуальной солью (Web Crypto, 100 000 итераций).
 * Это защита от хранения пароля открытым текстом и от быстрого перебора по украденной базе.
 * Полноценные argon2/bcrypt и серверные сессии — задача бэкенда (этап 4).
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/** Сравнение без раннего выхода: время не зависит от того, в каком символе хеши разошлись. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  return safeEqual(await hashPassword(password, salt), expectedHash);
}
