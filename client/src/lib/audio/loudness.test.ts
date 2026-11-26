import { describe, expect, it } from 'vitest';
import { measureLoudness } from './loudness';

const SAMPLE_RATE = 48000;

function sine(freq: number, amplitudeDb: number, seconds: number, sampleRate = SAMPLE_RATE) {
  const out = new Float32Array(Math.round(seconds * sampleRate));
  const amplitude = 10 ** (amplitudeDb / 20);
  for (let i = 0; i < out.length; i++)
    out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

describe('measureLoudness (ITU-R BS.1770-4)', () => {
  it('стерео-синус 997 Гц на −20 dBFS даёт ровно −20 LUFS (контрольный сигнал EBU)', () => {
    const channel = sine(997, -20, 10);
    expect(measureLoudness([channel, channel], SAMPLE_RATE)).toBeCloseTo(-20, 1);
  });

  it('моно-сигнал на 3 LU тише такого же стерео (каналы суммируются по энергии)', () => {
    const channel = sine(997, -20, 10);
    const stereo = measureLoudness([channel, channel], SAMPLE_RATE);
    const mono = measureLoudness([channel], SAMPLE_RATE);
    expect(stereo - mono).toBeCloseTo(3.01, 1);
  });

  it('уменьшение амплитуды на 6 дБ уменьшает громкость на 6 LU', () => {
    const loud = sine(997, -14, 8);
    const quiet = sine(997, -20, 8);
    const diff = measureLoudness([loud], SAMPLE_RATE) - measureLoudness([quiet], SAMPLE_RATE);
    expect(diff).toBeCloseTo(6, 1);
  });

  it('K-взвешивание: низкий бас (40 Гц) воспринимается тише, чем 1 кГц той же амплитуды', () => {
    const bass = measureLoudness([sine(40, -20, 8)], SAMPLE_RATE);
    const mid = measureLoudness([sine(1000, -20, 8)], SAMPLE_RATE);
    expect(bass).toBeLessThan(mid - 1);
  });

  it('работает и на частоте 44,1 кГц', () => {
    const channel = sine(997, -20, 10, 44100);
    expect(measureLoudness([channel, channel], 44100)).toBeCloseTo(-20, 1);
  });

  it('абсолютный гейт: тихие паузы не занижают результат', () => {
    const tone = sine(997, -20, 6);
    const silence = new Float32Array(SAMPLE_RATE * 6);
    const withSilence = new Float32Array(tone.length + silence.length);
    withSilence.set(tone, 0);
    withSilence.set(silence, tone.length);
    // Без гейтинга половина тишины дала бы −26 LUFS; блоки на стыке допускают небольшой сдвиг.
    const diff = measureLoudness([withSilence], SAMPLE_RATE) - measureLoudness([tone], SAMPLE_RATE);
    expect(Math.abs(diff)).toBeLessThan(0.25);
  });

  it('относительный гейт: очень тихий фон рядом с громкой частью игнорируется', () => {
    const loud = sine(997, -20, 6);
    const background = sine(997, -45, 6);
    const mixed = new Float32Array(loud.length + background.length);
    mixed.set(loud, 0);
    mixed.set(background, loud.length);
    const diff = measureLoudness([mixed], SAMPLE_RATE) - measureLoudness([loud], SAMPLE_RATE);
    expect(Math.abs(diff)).toBeLessThan(0.25);
  });

  it('тишина → −Infinity', () => {
    expect(measureLoudness([new Float32Array(SAMPLE_RATE * 2)], SAMPLE_RATE)).toBe(-Infinity);
  });

  it('запись короче одного блока (400 мс) → −Infinity', () => {
    expect(measureLoudness([sine(997, -20, 0.2)], SAMPLE_RATE)).toBe(-Infinity);
  });

  it('пустой список каналов → −Infinity', () => {
    expect(measureLoudness([], SAMPLE_RATE)).toBe(-Infinity);
  });
});
