/**
 * Пики для отрисовки волны: делим сигнал на `buckets` равных отрезков и берём
 * максимальную амплитуду (по всем каналам) в каждом. Результат нормализован к 0..1.
 */
export function computePeaks(channels: readonly Float32Array[], buckets: number): number[] {
  const first = channels[0];
  if (!first || first.length === 0 || buckets <= 0) return [];

  const length = first.length;
  const peaks = new Array<number>(buckets).fill(0);
  const samplesPerBucket = length / buckets;

  for (const channel of channels) {
    for (let b = 0; b < buckets; b++) {
      const start = Math.floor(b * samplesPerBucket);
      const end = Math.min(length, Math.max(start + 1, Math.floor((b + 1) * samplesPerBucket)));
      let max = peaks[b] ?? 0;
      for (let i = start; i < end; i++) {
        const value = Math.abs(channel[i] ?? 0);
        if (value > max) max = value;
      }
      peaks[b] = max;
    }
  }

  const top = Math.max(...peaks);
  if (top === 0) return peaks;
  return peaks.map((p) => Math.round((p / top) * 1000) / 1000);
}

/** Максимальный по модулю отсчёт среди всех каналов, в dBFS. Для тишины — −Infinity. */
export function samplePeakDb(channels: readonly Float32Array[]): number {
  let max = 0;
  for (const channel of channels) {
    for (const sample of channel) {
      const value = Math.abs(sample);
      if (value > max) max = value;
    }
  }
  return max === 0 ? -Infinity : 20 * Math.log10(max);
}
