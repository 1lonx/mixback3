import { describe, expect, it } from 'vitest';
import type { Comment } from '../types/domain';
import { buildChecklist, categorize } from './checklist';

const comment = (id: string, timeSec: number, text: string, resolved = false): Comment => ({
  id,
  versionId: 'v1',
  authorId: 'u1',
  authorName: 'Лера',
  timeSec,
  text,
  resolved,
  createdAt: '2026-11-01T00:00:00.000Z',
});

describe('categorize', () => {
  it.each([
    ['Бочка бубнит, подрезать низ', 'low'],
    ['Слишком много баса в куплете', 'low'],
    ['Вокал тонет в гитарах', 'vocal'],
    ['Сибилянты режут слух', 'vocal'],
    ['Хэты слишком яркие', 'highs'],
    ['Припев тише куплета, поднять громкость', 'dynamics'],
    ['Ревер слишком длинный', 'space'],
    ['Расширить стерео', 'space'],
    ['Сделай как-нибудь получше', 'other'],
  ])('«%s» → %s', (text, expected) => {
    expect(categorize(text)).toBe(expected);
  });

  it('приоритет: низ важнее вокала, если упомянуты оба', () => {
    expect(categorize('Бас перекрывает вокал')).toBe('low');
  });
});

describe('buildChecklist', () => {
  it('использует только нерешённые комментарии', () => {
    const items = buildChecklist([
      comment('a', 10, 'Бочка бубнит'),
      comment('b', 20, 'Вокал тихий', true),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.commentIds).toEqual(['a']);
  });

  it('пустой вход → пустой чек-лист', () => {
    expect(buildChecklist([])).toEqual([]);
  });

  it('склеивает близкие правки одной категории в одну задачу', () => {
    const items = buildChecklist([
      comment('a', 30, 'Бочка бубнит'),
      comment('b', 35, 'Ещё и бас гудит'),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.commentIds).toEqual(['a', 'b']);
    expect(items[0]?.text).toContain('Бочка бубнит');
    expect(items[0]?.text).toContain('Ещё и бас гудит');
  });

  it('не склеивает правки, между которыми больше 8 секунд', () => {
    const items = buildChecklist([comment('a', 10, 'Бочка бубнит'), comment('b', 40, 'Бас гудит')]);
    expect(items).toHaveLength(2);
  });

  it('не склеивает правки разных категорий', () => {
    const items = buildChecklist([
      comment('a', 10, 'Бочка бубнит'),
      comment('b', 12, 'Вокал тихий'),
    ]);
    expect(items.map((i) => i.category)).toEqual(['low', 'vocal']);
  });

  it('сортирует по категориям, затем по времени', () => {
    const items = buildChecklist([
      comment('a', 100, 'Ревер длинный'),
      comment('b', 50, 'Вокал тихий'),
      comment('c', 20, 'Бочка бубнит'),
    ]);
    expect(items.map((i) => i.category)).toEqual(['low', 'vocal', 'space']);
  });

  it('создаёт пункты невыполненными, с детерминированным id', () => {
    const [item] = buildChecklist([comment('a', 10, 'бочка бубнит')]);
    expect(item).toMatchObject({ id: 'cl-low-a', done: false, text: 'Бочка бубнит', timeSec: 10 });
  });

  it('не изменяет входной массив', () => {
    const input = [comment('b', 50, 'Вокал'), comment('a', 10, 'Бочка')];
    const copy = [...input];
    buildChecklist(input);
    expect(input).toEqual(copy);
  });
});
