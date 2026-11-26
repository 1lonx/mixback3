import { z } from 'zod';
import type { FieldErrors } from './errors';
import { cleanText } from './sanitize';

const clean = (inner: z.ZodType<string, string>) => z.string().transform(cleanText).pipe(inner);

const email = clean(
  z
    .string()
    .trim()
    .min(1, 'Укажите e-mail')
    .max(120, 'Слишком длинный e-mail')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Введите корректный e-mail, например name@mail.ru'),
);

const name = clean(
  z.string().trim().min(2, 'Имя — минимум 2 символа').max(40, 'Имя — не длиннее 40 символов'),
);

const newPassword = z
  .string()
  .min(8, 'Пароль — минимум 8 символов')
  .max(72, 'Пароль — не длиннее 72 символов')
  .regex(/\p{L}/u, 'Добавьте в пароль хотя бы одну букву')
  .regex(/\d/, 'Добавьте в пароль хотя бы одну цифру');

export const registerSchema = z.object({ name, email, password: newPassword });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Введите пароль').max(200, 'Слишком длинный пароль'),
});

export const updateProfileSchema = z.object({ name });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль').max(200),
    newPassword,
    confirmPassword: z.string().min(1, 'Повторите новый пароль'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Пароли не совпадают',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    error: 'Новый пароль должен отличаться от текущего',
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Введите пароль для подтверждения').max(200),
});

export const projectSchema = z.object({
  title: clean(
    z
      .string()
      .trim()
      .min(2, 'Название — минимум 2 символа')
      .max(80, 'Название — не длиннее 80 символов'),
  ),
  artist: clean(
    z.string().trim().min(1, 'Укажите артиста').max(60, 'Имя артиста — не длиннее 60 символов'),
  ),
  description: clean(z.string().trim().max(500, 'Описание — не длиннее 500 символов')),
  status: z.enum(['active', 'approved', 'archived']),
});

export const inviteSchema = z.object({ email });

export const commentSchema = z.object({
  timeSec: z.number({ error: 'Укажите время' }).min(0, 'Время не может быть отрицательным'),
  text: clean(
    z
      .string()
      .trim()
      .min(2, 'Комментарий — минимум 2 символа')
      .max(500, 'Комментарий — не длиннее 500 символов'),
  ),
});

export const versionSchema = z.object({
  note: clean(z.string().trim().max(120, 'Заметка — не длиннее 120 символов')),
});

export const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'm4a'] as const;

export function validateAudioFile(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const looksLikeAudio = file.type.startsWith('audio/') || AUDIO_EXTENSIONS.some((e) => e === ext);
  if (!looksLikeAudio) return 'Нужен аудиофайл: mp3, wav, ogg, flac или m4a';
  if (file.size === 0) return 'Файл пустой';
  if (file.size > MAX_AUDIO_BYTES) return 'Файл больше 60 МБ';
  return null;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_COVER_BYTES = 400 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateImageFile(file: Pick<File, 'size' | 'type'>): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Нужна картинка в формате JPEG, PNG или WebP';
  }
  if (file.size === 0) return 'Файл пустой';
  if (file.size > MAX_IMAGE_BYTES) return 'Картинка больше 10 МБ';
  return null;
}

export type ParseResult<T> = { success: true; data: T } | { success: false; errors: FieldErrors };

export function parseWith<T>(schema: z.ZodType<T>, input: unknown): ParseResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join('.') || '_form';
    errors[key] ??= issue.message;
  }
  return { success: false, errors };
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const serviceKind = z.enum(['mixing', 'mastering', 'vocal', 'editing']);
const genre = z.enum(['Поп', 'Рок', 'Хип-хоп', 'Электроника', 'Метал', 'Инди', 'Джаз', 'Фолк']);

export const MAX_SERVICES = 6;
export const MAX_GENRES = 4;
export const MAX_PORTFOLIO_TRACKS = 8;

export const serviceSchema = z.object({
  id: z.string().max(40).optional(),
  kind: serviceKind,
  title: clean(
    z.string().trim().min(3, 'Название — минимум 3 символа').max(60, 'Название — до 60 символов'),
  ),
  description: clean(z.string().trim().max(300, 'Описание — до 300 символов')),
  priceRub: z
    .number({ error: 'Укажите цену' })
    .int('Цена — целое число рублей')
    .min(500, 'Минимальная цена — 500 ₽')
    .max(500_000, 'Максимальная цена — 500 000 ₽'),
  days: z
    .number({ error: 'Укажите срок' })
    .int('Срок — целое число дней')
    .min(1, 'Срок — от 1 дня')
    .max(60, 'Срок — до 60 дней'),
});

export const engineerSchema = z
  .object({
    headline: clean(
      z
        .string()
        .trim()
        .min(5, 'Заголовок — минимум 5 символов')
        .max(80, 'Заголовок — до 80 символов'),
    ),
    bio: clean(z.string().trim().max(1000, 'О себе — до 1000 символов')),
    genres: z.array(genre).max(MAX_GENRES, `Не больше ${MAX_GENRES} жанров`),
    services: z.array(serviceSchema).max(MAX_SERVICES, `Не больше ${MAX_SERVICES} услуг`),
    published: z.boolean(),
  })
  .refine((v) => !v.published || v.services.length > 0, {
    path: ['services'],
    error: 'Чтобы опубликовать профиль, добавьте хотя бы одну услугу',
  });

export const trackSchema = z.object({
  title: clean(
    z.string().trim().min(2, 'Название — минимум 2 символа').max(60, 'Название — до 60 символов'),
  ),
  genre,
  description: clean(z.string().trim().max(200, 'Описание — до 200 символов')),
});

export const orderSchema = z.object({
  engineerId: z.string().min(1),
  serviceId: z.string().min(1, 'Выберите услугу'),
  brief: clean(
    z
      .string()
      .trim()
      .min(10, 'Опишите задачу хотя бы в двух словах — минимум 10 символов')
      .max(500, 'Описание — до 500 символов'),
  ),
});

export const reviewSchema = z.object({
  rating: z
    .number({ error: 'Поставьте оценку' })
    .int()
    .min(1, 'Поставьте оценку от 1 до 5')
    .max(5, 'Поставьте оценку от 1 до 5'),
  text: clean(z.string().trim().max(500, 'Отзыв — до 500 символов')),
});

export const messageSchema = z.object({
  text: clean(
    z.string().trim().min(1, 'Введите сообщение').max(1000, 'Сообщение — до 1000 символов'),
  ),
});

export type MessageInput = z.infer<typeof messageSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type EngineerInput = z.infer<typeof engineerSchema>;
export type TrackInput = z.infer<typeof trackSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
