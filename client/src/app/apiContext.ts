import { createContext, useContext } from 'react';
import type { AppApi } from '../api';

export const ApiContext = createContext<AppApi | null>(null);

export function useApi(): AppApi {
  const value = useContext(ApiContext);
  if (!value) throw new Error('useApi нужно вызывать внутри <ApiProvider>');
  return value;
}
