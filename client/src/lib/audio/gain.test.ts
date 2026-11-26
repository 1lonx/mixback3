import { describe, expect, it } from 'vitest';
import { matchGain, referenceLufs } from './gain';

describe('referenceLufs', () => {
  it('эталон — самая тихая версия', () => {
    expect(referenceLufs([-10.6, -18.4, -12.9])).toBe(-18.4);
  });

  it('игнорирует нечисловые значения', () => {
    expect(referenceLufs([-Infinity, -14, Number.NaN])).toBe(-14);
  });

  it('нет подходящих значений → null', () => {
    expect(referenceLufs([])).toBeNull();
    expect(referenceLufs([-Infinity])).toBeNull();
  });
});

describe('matchGain', () => {
  it('версия на уровне эталона не меняется', () => {
    expect(matchGain(-18.4, -18.4)).toBe(1);
  });

  it('более громкая версия ослабляется: на 6 LU тише → ×0,5', () => {
    expect(matchGain(-12, -18)).toBeCloseTo(0.501, 2);
  });

  it('коэффициент никогда не превышает 1 (элемент <audio> не умеет усиливать)', () => {
    expect(matchGain(-30, -18)).toBe(1);
  });

  it('без эталона или с некорректной громкостью — без изменений', () => {
    expect(matchGain(-12, null)).toBe(1);
    expect(matchGain(Number.NaN, -18)).toBe(1);
  });
});
