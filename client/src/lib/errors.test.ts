import { describe, expect, it } from 'vitest';
import {
  ApiError,
  errorMessage,
  forbidden,
  isSerializedError,
  networkError,
  notFound,
  serializeError,
  unauthorized,
} from './errors';

describe('ошибки API', () => {
  it('serializeError превращает ApiError в простой объект (его можно хранить в Redux)', () => {
    const error = new ApiError(400, 'VALIDATION', 'Проверьте поля', { email: 'плохо' });
    const plain = serializeError(error);
    expect(plain).toEqual({
      status: 400,
      code: 'VALIDATION',
      message: 'Проверьте поля',
      fieldErrors: { email: 'плохо' },
    });
    expect(JSON.parse(JSON.stringify(plain))).toEqual(plain);
  });

  it('serializeError: обычная ошибка и не-ошибка', () => {
    expect(serializeError(new Error('boom'))).toEqual({
      status: 0,
      code: 'UNKNOWN',
      message: 'boom',
    });
    expect(serializeError('строка')).toMatchObject({ status: 0, message: 'Неизвестная ошибка' });
  });

  it('готовые фабрики дают правильные статусы', () => {
    expect(notFound('Проект')).toMatchObject({ status: 404, message: 'Проект не найден' });
    expect(forbidden()).toMatchObject({ status: 403 });
    expect(unauthorized()).toMatchObject({ status: 401 });
    expect(networkError()).toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('isSerializedError / errorMessage', () => {
    expect(isSerializedError({ status: 404, message: 'нет' })).toBe(true);
    expect(isSerializedError({ message: 'нет статуса' })).toBe(false);
    expect(isSerializedError(null)).toBe(false);
    expect(errorMessage({ status: 500, message: 'сервер' }, 'запасной')).toBe('сервер');
    expect(errorMessage(new Error('x'), 'запасной')).toBe('запасной');
  });
});
