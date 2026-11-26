export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(status: number, code: string, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export interface SerializedError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }
  return {
    status: 0,
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Неизвестная ошибка',
  };
}

export const notFound = (what = 'Ресурс') => new ApiError(404, 'NOT_FOUND', `${what} не найден`);
export const forbidden = (message = 'Недостаточно прав для этого действия') =>
  new ApiError(403, 'FORBIDDEN', message);
export const unauthorized = (message = 'Нужно войти в аккаунт') =>
  new ApiError(401, 'UNAUTHORIZED', message);
export const networkError = () =>
  new ApiError(0, 'NETWORK', 'Нет соединения с сервером. Проверьте интернет и повторите попытку.');

export function isSerializedError(value: unknown): value is SerializedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    'status' in value &&
    typeof value.status === 'number'
  );
}

export const errorMessage = (error: unknown, fallback: string): string =>
  isSerializedError(error) ? error.message : fallback;
