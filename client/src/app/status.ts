import type { SerializedError } from '../lib/errors';

/** Жизненный цикл асинхронной операции — ровно те состояния, что требует ТЗ. */
export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface RejectedLike {
  payload?: SerializedError | undefined;
  error: { message?: string | undefined };
}

/** Достаёт ошибку из rejected-экшена: наш rejectValue или запасной вариант от RTK. */
export function errorFrom(action: RejectedLike): SerializedError {
  return (
    action.payload ?? {
      status: 0,
      code: 'UNKNOWN',
      message: action.error.message ?? 'Что-то пошло не так',
    }
  );
}
