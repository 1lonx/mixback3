import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENGINEERS_QUERY,
  hasActiveEngineerFilters,
  parseEngineersQuery,
  toEngineersParams,
} from './query';

describe('фильтры каталога в адресе', () => {
  it('пустой адрес даёт значения по умолчанию', () => {
    expect(parseEngineersQuery(new URLSearchParams())).toEqual(DEFAULT_ENGINEERS_QUERY);
  });

  it('читает допустимые значения', () => {
    const query = parseEngineersQuery(
      new URLSearchParams('q=рок&kind=mastering&genre=Метал&price=5000&sort=price'),
    );
    expect(query).toEqual({
      q: 'рок',
      kind: 'mastering',
      genre: 'Метал',
      maxPrice: 5000,
      sort: 'price',
    });
  });

  it('мусорные значения заменяются значениями по умолчанию', () => {
    const query = parseEngineersQuery(
      new URLSearchParams('kind=<script>&genre=Шансон&price=1&sort=;drop&q=' + 'я'.repeat(200)),
    );
    expect(query).toMatchObject({ kind: 'all', genre: 'all', maxPrice: null, sort: 'rating' });
    expect(query.q).toHaveLength(80);
  });

  it('цена принимается только из заданных ступеней', () => {
    expect(parseEngineersQuery(new URLSearchParams('price=4999')).maxPrice).toBeNull();
    expect(parseEngineersQuery(new URLSearchParams('price=abc')).maxPrice).toBeNull();
  });

  it('значения по умолчанию в адрес не пишутся', () => {
    expect(toEngineersParams(DEFAULT_ENGINEERS_QUERY).toString()).toBe('');
    expect(
      toEngineersParams({ ...DEFAULT_ENGINEERS_QUERY, q: '  вокал ', maxPrice: 3000 }).toString(),
    ).toBe('q=%D0%B2%D0%BE%D0%BA%D0%B0%D0%BB&price=3000');
  });

  it('сортировка не считается фильтром', () => {
    expect(hasActiveEngineerFilters({ ...DEFAULT_ENGINEERS_QUERY, sort: 'price' })).toBe(false);
    expect(hasActiveEngineerFilters({ ...DEFAULT_ENGINEERS_QUERY, genre: 'Джаз' })).toBe(true);
    expect(hasActiveEngineerFilters({ ...DEFAULT_ENGINEERS_QUERY, q: '   ' })).toBe(false);
  });
});
