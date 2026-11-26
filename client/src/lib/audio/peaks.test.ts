import { describe, expect, it } from 'vitest';
import { computePeaks, samplePeakDb } from './peaks';

describe('computePeaks', () => {
  it('возвращает ровно столько пиков, сколько просили', () => {
    const channel = Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10));
    expect(computePeaks([channel], 50)).toHaveLength(50);
  });

  it('нормализует максимум к 1', () => {
    const channel = new Float32Array([0.1, -0.25, 0.05, 0.5]);
    const peaks = computePeaks([channel], 4);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks).toEqual([0.2, 0.5, 0.1, 1]);
  });

  it('берёт максимум по модулю: отрицательные отсчёты учитываются', () => {
    expect(computePeaks([new Float32Array([-0.8, 0.2])], 1)).toEqual([1]);
  });

  it('объединяет каналы: пик берётся по самому громкому', () => {
    const left = new Float32Array([0.1, 0.1]);
    const right = new Float32Array([0.4, 0.2]);
    expect(computePeaks([left, right], 2)).toEqual([1, 0.5]);
  });

  it('тишина остаётся нулями, без деления на ноль', () => {
    expect(computePeaks([new Float32Array(100)], 10)).toEqual(new Array<number>(10).fill(0));
  });

  it('пустые данные или нулевое число отрезков → пустой массив', () => {
    expect(computePeaks([], 10)).toEqual([]);
    expect(computePeaks([new Float32Array(0)], 10)).toEqual([]);
    expect(computePeaks([new Float32Array(10)], 0)).toEqual([]);
  });

  it('если отсчётов меньше, чем отрезков, не падает и не теряет сигнал', () => {
    const peaks = computePeaks([new Float32Array([0.5, 1])], 8);
    expect(peaks).toHaveLength(8);
    expect(Math.max(...peaks)).toBe(1);
  });
});

describe('samplePeakDb', () => {
  it('полная шкала = 0 dBFS', () => {
    expect(samplePeakDb([new Float32Array([0, 1, -0.5])])).toBeCloseTo(0, 5);
  });

  it('половинная амплитуда ≈ −6 dBFS', () => {
    expect(samplePeakDb([new Float32Array([0.5])])).toBeCloseTo(-6.02, 2);
  });

  it('тишина → −Infinity', () => {
    expect(samplePeakDb([new Float32Array(10)])).toBe(-Infinity);
  });
});
