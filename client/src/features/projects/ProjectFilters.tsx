import { Input, Select } from '../../components/ui/Field';
import { SORT_LABELS, STATUS_LABELS } from '../../lib/labels';
import { SEARCH_DEBOUNCE_MS, useDebouncedSearch } from '../../lib/useDebouncedSearch';
import type { ProjectsQuery, ProjectStatus, SortKey } from '../../types/domain';
import styles from './ProjectFilters.module.css';

export { SEARCH_DEBOUNCE_MS };

interface ProjectFiltersProps {
  query: ProjectsQuery;
  onChange: (patch: Partial<ProjectsQuery>) => void;
}

export function ProjectFilters({ query, onChange }: ProjectFiltersProps) {
  const [search, handleSearch] = useDebouncedSearch(query.q, (q) => onChange({ q }));

  return (
    <form
      className={styles.filters}
      role="search"
      aria-label="Поиск по проектам"
      onSubmit={(event) => event.preventDefault()}
    >
      <Input
        label="Поиск"
        type="search"
        name="q"
        placeholder="Название или артист"
        value={search}
        onChange={(event) => handleSearch(event.target.value)}
        autoComplete="off"
      />
      <Select
        label="Статус"
        name="status"
        value={query.status}
        onChange={(event) => onChange({ status: event.target.value as ProjectStatus | 'all' })}
      >
        <option value="all">Все</option>
        {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      <Select
        label="Сортировка"
        name="sort"
        value={query.sort}
        onChange={(event) => onChange({ sort: event.target.value as SortKey })}
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </Select>
    </form>
  );
}
