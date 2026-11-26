import { createContext, useContext } from 'react';
import type { AppApi } from '../api';

export const ApiContext = createContext<AppApi | null>(null);

/** Отдаёт компонентам API для задач вне Redux (адрес аудио, настройки демо-режима). */
export function useApi(): AppApi {
  const value = useContext(ApiContext);
  if (!value) throw new Error('useApi нужно вызывать внутри <ApiProvider>');
  return value;
}
