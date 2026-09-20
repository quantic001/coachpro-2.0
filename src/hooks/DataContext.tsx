import { createContext, useContext, type ReactNode } from 'react';
import { useAppData, type AppData } from './useAppData';

const Ctx = createContext<AppData | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const data = useAppData();
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useData(): AppData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData hors DataProvider');
  return ctx;
}
