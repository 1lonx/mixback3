import { Input, Select } from '../../components/ui/Field';
import { ENGINEER_SORT_LABELS, formatPrice, SERVICE_LABELS } from '../../lib/labels';
import { useDebouncedSearch } from '../../lib/useDebouncedSearch';
import {
  GENRES,
  SERVICE_KINDS,
  type EngineersQuery,
  type EngineerSort,
  type Genre,
  type ServiceKind,
} from '../../types/domain';
import { PRICE_STEPS } from './query';
import styles from './EngineerFilters.module.css';

interface EngineerFiltersProps {
  query: EngineersQuery;
  onChange: (patch: Partial<EngineersQuery>) => void;
}

export function EngineerFilters({ query, onChange }: EngineerFiltersProps) {
  const [search, handleSearch] = useDebouncedSearch(query.q, (q) => onChange({ q }));

  return (
    <form
      className={styles.filters}
      role="search"
      aria-label="Поиск звукорежиссёра"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={styles.search}>
        <Input
          label="Поиск"
          type="search"
          name="q"
          placeholder="Имя, жанр или услуга"
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          autoComplete="off"
        />
      </div>
      <Select
        label="Услуга"
        name="kind"
        value={query.kind}
        onChange={(event) => onChange({ kind: event.target.value as ServiceKind | 'all' })}
      >
        <option value="all">Любая</option>
        {SERVICE_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {SERVICE_LABELS[kind]}
          </option>
        ))}
      </Select>
      <Select
        label="Жанр"
        name="genre"
        value={query.genre}
        onChange={(event) => onChange({ genre: event.target.value as Genre | 'all' })}
      >
        <option value="all">Любой</option>
        {GENRES.map((genre) => (
          <option key={genre} value={genre}>
            {genre}
          </option>
        ))}
      </Select>
      <Select
        label="Цена"
        name="price"
        value={query.maxPrice === null ? '' : String(query.maxPrice)}
        onChange={(event) =>
          onChange({ maxPrice: event.target.value === '' ? null : Number(event.target.value) })
        }
      >
        <option value="">Любая</option>
        {PRICE_STEPS.map((step) => (
          <option key={step} value={step}>
            до {formatPrice(step)}
          </option>
        ))}
      </Select>
      <Select
        label="Сортировка"
        name="sort"
        value={query.sort}
        onChange={(event) => onChange({ sort: event.target.value as EngineerSort })}
      >
        {(Object.keys(ENGINEER_SORT_LABELS) as EngineerSort[]).map((sort) => (
          <option key={sort} value={sort}>
            {ENGINEER_SORT_LABELS[sort]}
          </option>
        ))}
      </Select>
    </form>
  );
}
