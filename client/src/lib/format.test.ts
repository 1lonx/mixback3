import { describe, expect, it } from 'vitest';
import {
  clamp,
  formatDate,
  formatDb,
  formatFileSize,
  formatLufs,
  formatTime,
  parseTime,
  pluralize,
} from './format';

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [82, '1:22'],
    [273.9, '4:33'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('%s с → %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });

  it('отрицательные и некорректные значения → 0:00', () => {
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('parseTime', () => {
  it.each([
    ['1:22', 82],
    ['0:05', 5],
    ['12:00', 720],
    ['1:02:05', 3725],
    ['  2:30  ', 150],
  ])('«%s» → %s', (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each(['', 'abc', '1:2', '1:60', '-1:20', '1.5', '1:22:3'])('«%s» → null', (input) => {
    expect(parseTime(input)).toBeNull();
  });

  it('обратим с formatTime', () => {
    for (const seconds of [0, 7, 59, 60, 61, 599, 3599]) {
      expect(parseTime(formatTime(seconds))).toBe(seconds);
    }
  });
});

describe('форматирование чисел', () => {
  it('LUFS и dB используют настоящий минус', () => {
    expect(formatLufs(-12.94)).toBe('−12.9 LUFS');
    expect(formatDb(-0.3)).toBe('−0.3 dB');
  });

  it('pluralize склоняет по-русски', () => {
    const forms = ['версия', 'версии', 'версий'] as const;
    expect(pluralize(1, forms)).toBe('1 версия');
    expect(pluralize(2, forms)).toBe('2 версии');
    expect(pluralize(5, forms)).toBe('5 версий');
    expect(pluralize(11, forms)).toBe('11 версий');
    expect(pluralize(21, forms)).toBe('21 версия');
    expect(pluralize(0, forms)).toBe('0 версий');
  });

  it('formatFileSize', () => {
    expect(formatFileSize(100)).toBe('1 КБ');
    expect(formatFileSize(512 * 1024)).toBe('512 КБ');
    expect(formatFileSize(7.5 * 1024 * 1024)).toBe('7,5 МБ');
  });

  it('formatDate: некорректная дата → пустая строка', () => {
    expect(formatDate('не дата')).toBe('');
    expect(formatDate('2026-11-01T12:00:00.000Z')).toContain('2026');
  });

  it('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
