import { useEffect, useState } from 'react';
import { useApi } from '../../app/apiContext';
import { serializeError, type SerializedError } from '../../lib/errors';
import type { Version } from '../../types/domain';

interface Resolved {
  versionId: string;
  url: string | null;
  error: SerializedError | null;
}

/**
 * Получает адрес аудио версии. Для загруженных файлов это blob:-ссылка из IndexedDB —
 * её нужно освобождать, иначе файл останется в памяти до закрытия вкладки.
 */
export function useAudioUrl(version: Pick<Version, 'id' | 'fileUrl'>): {
  url: string | null;
  error: SerializedError | null;
} {
  const { api } = useApi();
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    api.versions
      .audioUrl(version)
      .then((url) => {
        if (cancelled) {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
          return;
        }
        if (url.startsWith('blob:')) objectUrl = url;
        setResolved({ versionId: version.id, url, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setResolved({ versionId: version.id, url: null, error: serializeError(error) });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [api, version]);

  // Результат для другой версии считаем «ещё не получен»: плеер не должен играть чужой файл.
  const current = resolved?.versionId === version.id ? resolved : null;
  return { url: current?.url ?? null, error: current?.error ?? null };
}
