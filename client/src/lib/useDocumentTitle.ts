import { useEffect } from 'react';

/** Заголовок вкладки: на SPA без этого скринридер не узнает, что страница сменилась. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — Mixback`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
