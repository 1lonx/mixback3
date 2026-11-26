import { describe, expect, it } from 'vitest';
import { DEFAULT_QUERY, hasActiveFilters, parseProjectsQuery, toSearchParams } from './query';

describe('parseProjectsQuery', () => {
  it('пустой адрес → значения по умолчанию', () => {
    expect(parseProjectsQuery(new URLSearchParams())).toEqual(DEFAULT_QUERY);
  });

  it('читает корректные параметры', () => {
    const params = new URLSearchParams('q=ночь&status=approved&sort=title');
    expect(parseProjectsQuery(params)).toEqual({ q: 'ночь', status: 'approved', sort: 'title' });
  });

  it('мусорные значения status и sort заменяются умолчаниями', () => {
    const params = new URLSearchParams('status=hacked&sort=;drop');
    expect(parseProjectsQuery(params)).toEqual(DEFAULT_QUERY);
  });

  it('ограничивает длину строки поиска', () => {
    expect(parseProjectsQuery(new URLSearchParams({ q: 'я'.repeat(500) })).q).toHaveLength(80);
  });
});

describe('toSearchParams', () => {
  it('значения по умолчанию в адрес не попадают', () => {
    expect(toSearchParams(DEFAULT_QUERY).toString()).toBe('');
  });

  it('обратимо с parseProjectsQuery', () => {
    const query = { q: 'ночь город', status: 'active', sort: 'comments' } as const;
    expect(parseProjectsQuery(toSearchParams(query))).toEqual(query);
  });

  it('пробелы вокруг поиска обрезаются, пустой поиск не пишется', () => {
    expect(toSearchParams({ ...DEFAULT_QUERY, q: '   ' }).toString()).toBe('');
    expect(toSearchParams({ ...DEFAULT_QUERY, q: ' а ' }).get('q')).toBe('а');
  });
});

describe('hasActiveFilters', () => {
  it('сортировка фильтром не считается', () => {
    expect(hasActiveFilters({ ...DEFAULT_QUERY, sort: 'title' })).toBe(false);
  });

  it('поиск и статус — считаются', () => {
    expect(hasActiveFilters({ ...DEFAULT_QUERY, q: 'a' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_QUERY, status: 'active' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_QUERY, q: '  ' })).toBe(false);
  });
});
