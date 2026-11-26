export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

const COMMON = [
  'password',
  'qwerty',
  '12345678',
  '123456789',
  'пароль',
  'йцукен',
  'letmein',
  'admin',
];

export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: '' };

  let points = 0;
  if (password.length >= 8) points++;
  if (password.length >= 12) points++;
  if (/\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)) points++;
  if (/\d/.test(password) && /\p{L}/u.test(password)) points++;
  if (/[^\p{L}\d]/u.test(password)) points++;
  if (new Set(password).size < Math.ceil(password.length / 2)) points--;
  if (COMMON.some((word) => password.toLowerCase().includes(word))) points = Math.min(points, 1);

  const score = Math.max(
    0,
    Math.min(4, points - (password.length < 8 ? 1 : 0)),
  ) as PasswordStrength['score'];
  const labels = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Надёжный'] as const;
  return { score, label: labels[score] };
}
