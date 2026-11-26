import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppApi } from '../api';
import { serializeError, type SerializedError } from '../lib/errors';

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
