import type { SerializedError } from '../lib/errors';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface RejectedLike {
  payload?: SerializedError | undefined;
  error: { message?: string | undefined };
}

export function errorFrom(action: RejectedLike): SerializedError {
  return (
    action.payload ?? {
      status: 0,
      code: 'UNKNOWN',
      message: action.error.message ?? 'Что-то пошло не так',
    }
  );
}
