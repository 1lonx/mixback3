import { useEffect, useRef, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedSearch(
  urlValue: string,
  commit: (value: string) => void,
): [string, (value: string) => void] {
  const [search, setSearch] = useState(urlValue);
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
