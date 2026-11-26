import { describe, expect, it } from 'vitest';
import {
  commentSchema,
  inviteSchema,
  loginSchema,
  parseWith,
  projectSchema,
  registerSchema,
  validateAudioFile,
} from './schemas';

describe('registerSchema', () => {
  const valid = { name: 'Алекс', email: 'alex@mail.ru', password: 'secret123' };

  it('принимает корректные данные', () => {
    expect(parseWith(registerSchema, valid).success).toBe(true);
  });

  it('обрезает пробелы в имени и e-mail', () => {
    const result = parseWith(registerSchema, {
      ...valid,
      name: '  Алекс  ',
      email: ' alex@mail.ru ',
    });
    expect(result).toMatchObject({ success: true, data: { name: 'Алекс', email: 'alex@mail.ru' } });
  });

  it.each([
    ['name', { name: 'А' }, 'Имя — минимум 2 символа'],
    ['email', { email: 'без-собаки' }, 'Введите корректный e-mail, например name@mail.ru'],
    ['email', { email: '' }, 'Укажите e-mail'],
    ['password', { password: 'short1' }, 'Пароль — минимум 8 символов'],
    ['password', { password: '12345678' }, 'Добавьте в пароль хотя бы одну букву'],
    ['password', { password: 'abcdefgh' }, 'Добавьте в пароль хотя бы одну цифру'],
  ])('ошибка в поле %s', (field, patch, message) => {
    const result = parseWith(registerSchema, { ...valid, ...patch });
    expect(result).toMatchObject({ success: false, errors: { [field]: message } });
  });

  it('собирает ошибки по всем полям сразу', () => {
    const result = parseWith(registerSchema, { name: '', email: '', password: '' });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(Object.keys(result.errors).sort()).toEqual(['email', 'name', 'password']);
  });

  it('пароль с кириллицей и цифрой допустим', () => {
    expect(parseWith(registerSchema, { ...valid, password: 'пароль12345' }).success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('не требует сложности пароля — только непустой', () => {
    expect(parseWith(loginSchema, { email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(parseWith(loginSchema, { email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('projectSchema', () => {
  const valid = { title: 'Ночной город', artist: 'Лера К.', description: '', status: 'active' };

  it('принимает корректный проект с пустым описанием', () => {
    expect(parseWith(projectSchema, valid).success).toBe(true);
  });

  it('отклоняет пустое название и слишком длинное описание', () => {
    expect(parseWith(projectSchema, { ...valid, title: ' ' })).toMatchObject({ success: false });
    const long = parseWith(projectSchema, { ...valid, description: 'я'.repeat(501) });
    expect(long).toMatchObject({
      success: false,
      errors: { description: 'Описание — не длиннее 500 символов' },
    });
  });

  it('отклоняет неизвестный статус', () => {
    expect(parseWith(projectSchema, { ...valid, status: 'deleted' }).success).toBe(false);
  });
});

describe('commentSchema', () => {
  it('принимает таймкод 0 и корректный текст', () => {
    expect(parseWith(commentSchema, { timeSec: 0, text: 'Бочка бубнит' }).success).toBe(true);
  });

  it('отклоняет отрицательное время, NaN и короткий текст', () => {
    expect(parseWith(commentSchema, { timeSec: -1, text: 'Бочка' })).toMatchObject({
      errors: { timeSec: 'Время не может быть отрицательным' },
    });
    expect(parseWith(commentSchema, { timeSec: Number.NaN, text: 'Бочка' }).success).toBe(false);
    expect(parseWith(commentSchema, { timeSec: 5, text: 'а' }).success).toBe(false);
  });
});

describe('inviteSchema', () => {
  it('проверяет e-mail', () => {
    expect(parseWith(inviteSchema, { email: 'artist@mixback.app' }).success).toBe(true);
    expect(parseWith(inviteSchema, { email: 'artist' }).success).toBe(false);
  });
});

describe('validateAudioFile', () => {
  const file = (name: string, size = 1000, type = '') => ({ name, size, type });

  it('принимает известные расширения и audio/* типы', () => {
    expect(validateAudioFile(file('mix.MP3'))).toBeNull();
    expect(validateAudioFile(file('mix.wav'))).toBeNull();
    expect(validateAudioFile(file('noext', 1000, 'audio/mpeg'))).toBeNull();
  });

  it('отклоняет не-аудио', () => {
    expect(validateAudioFile(file('photo.png', 1000, 'image/png'))).toMatch(/аудиофайл/);
  });

  it('отклоняет пустой и слишком большой файл', () => {
    expect(validateAudioFile(file('mix.mp3', 0))).toBe('Файл пустой');
    expect(validateAudioFile(file('mix.mp3', 61 * 1024 * 1024))).toBe('Файл больше 60 МБ');
  });
});
