import { useEffect, useRef, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Текст поиска хранится в поле и уходит в адрес с задержкой — не на каждую букву.
 * Если адрес изменился «снаружи» (кнопка «Назад», сброс фильтров), поле подстраивается:
 * это делается прямо при рендере, без эффекта, чтобы не было лишней отрисовки со старым текстом.
 */
export function useDebouncedSearch(
  urlValue: string,
  commit: (value: string) => void,
): [string, (value: string) => void] {
  const [search, setSearch] = useState(urlValue);
  /** Последнее значение, которое поле само отправило в адрес. */
  const [emitted, setEmitted] = useState(urlValue);
  const [seen, setSeen] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (urlValue !== seen) {
    setSeen(urlValue);
    if (urlValue !== emitted) {
      setSearch(urlValue);
      setEmitted(urlValue);
    }
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (value: string) => {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setEmitted(value);
      commit(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  return [search, handleChange];
}
