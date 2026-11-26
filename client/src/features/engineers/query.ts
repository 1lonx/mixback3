import { GENRES, SERVICE_KINDS, type EngineersQuery, type EngineerSort } from '../../types/domain';

export const DEFAULT_ENGINEERS_QUERY: EngineersQuery = {
  q: '',
  kind: 'all',
  genre: 'all',
  maxPrice: null,
  sort: 'rating',
};

const SORTS: readonly EngineerSort[] = ['rating', 'price', 'orders'];
export const PRICE_STEPS = [2000, 3000, 5000, 8000] as const;

export function parseEngineersQuery(params: URLSearchParams): EngineersQuery {
  const kind = params.get('kind');
  const genre = params.get('genre');
  const sort = params.get('sort');
  const price = Number(params.get('price'));
  return {
    q: params.get('q')?.slice(0, 80) ?? DEFAULT_ENGINEERS_QUERY.q,
    kind: SERVICE_KINDS.find((k) => k === kind) ?? 'all',
    genre: GENRES.find((g) => g === genre) ?? 'all',
    maxPrice: PRICE_STEPS.find((p) => p === price) ?? null,
    sort: SORTS.find((s) => s === sort) ?? DEFAULT_ENGINEERS_QUERY.sort,
  };
}

export function toEngineersParams(query: EngineersQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set('q', query.q.trim());
  if (query.kind !== 'all') params.set('kind', query.kind);
  if (query.genre !== 'all') params.set('genre', query.genre);
  if (query.maxPrice !== null) params.set('price', String(query.maxPrice));
  if (query.sort !== DEFAULT_ENGINEERS_QUERY.sort) params.set('sort', query.sort);
  return params;
}

export function hasActiveEngineerFilters(query: EngineersQuery): boolean {
  return (
    query.q.trim() !== '' ||
    query.kind !== 'all' ||
    query.genre !== 'all' ||
    query.maxPrice !== null
  );
}
