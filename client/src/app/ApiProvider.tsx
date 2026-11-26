import type { ReactNode } from 'react';
import type { AppApi } from '../api';
import { ApiContext } from './apiContext';

export function ApiProvider({ value, children }: { value: AppApi; children: ReactNode }) {
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}
