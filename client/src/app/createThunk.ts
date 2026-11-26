import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppApi } from '../api';
import { serializeError, type SerializedError } from '../lib/errors';

/** В `extra` лежит API: слайсы не знают, мок это или настоящий сервер. */
export interface ThunkExtra {
  api: AppApi['api'];
}

const createAppThunk = createAsyncThunk.withTypes<{
  extra: ThunkExtra;
  rejectValue: SerializedError;
}>();

interface CallContext {
  api: AppApi['api'];
}

/**
 * Обёртка над createAsyncThunk: любую ошибку превращает в сериализуемую
 * `SerializedError` и отдаёт через rejectWithValue — в state попадает только простой объект.
 */
export function apiThunk<Returned, Arg = void>(
  type: string,
  call: (arg: Arg, context: CallContext) => Promise<Returned>,
) {
  return createAppThunk<Returned, Arg>(type, async (arg, thunkApi) => {
    try {
      return await call(arg, { api: thunkApi.extra.api });
    } catch (error) {
      return thunkApi.rejectWithValue(serializeError(error));
    }
  });
}
