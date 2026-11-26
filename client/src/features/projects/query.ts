import type { ProjectsQuery, ProjectStatus, SortKey } from '../../types/domain';

export const DEFAULT_QUERY: ProjectsQuery = { q: '', status: 'all', sort: 'updated' };

const STATUSES: readonly ProjectStatus[] = ['active', 'approved', 'archived'];
const SORTS: readonly SortKey[] = ['updated', 'title', 'comments'];

/** Читает фильтры из адресной строки. Мусорные значения молча заменяются значениями по умолчанию. */
export function parseProjectsQuery(params: URLSearchParams): ProjectsQuery {
  const status = params.get('status');
  const sort = params.get('sort');
  return {
    q: params.get('q')?.slice(0, 80) ?? DEFAULT_QUERY.q,
    status: STATUSES.find((s) => s === status) ?? DEFAULT_QUERY.status,
    sort: SORTS.find((s) => s === sort) ?? DEFAULT_QUERY.sort,
  };
}

/** Обратное преобразование. Значения по умолчанию не пишем — адрес остаётся коротким. */
export function toSearchParams(query: ProjectsQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set('q', query.q.trim());
  if (query.status !== DEFAULT_QUERY.status) params.set('status', query.status);
  if (query.sort !== DEFAULT_QUERY.sort) params.set('sort', query.sort);
  return params;
}

export function hasActiveFilters(query: ProjectsQuery): boolean {
  return query.q.trim() !== '' || query.status !== 'all';
}
