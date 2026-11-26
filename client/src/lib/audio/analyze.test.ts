import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeAudioFile, PEAK_BUCKETS } from './analyze';

function stubAudioContext(decode: () => Promise<unknown>) {
  const close = vi.fn(() => Promise.resolve());
  class FakeAudioContext {
    decodeAudioData = decode;
    close = close;
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, configurable: true });
  return close;
}

const fakeBuffer = (channels: Float32Array[], sampleRate = 48000) => ({
  numberOfChannels: channels.length,
  sampleRate,
  duration: (channels[0]?.length ?? 0) / sampleRate,
  getChannelData: (i: number) => channels[i]!,
});

const sine = (seconds: number, amplitude: number, sampleRate = 48000) =>
  Float32Array.from(
    { length: seconds * sampleRate },
    (_, i) => amplitude * Math.sin((2 * Math.PI * 997 * i) / sampleRate),
  );

afterEach(() => vi.unstubAllGlobals());

describe('analyzeAudioFile', () => {
  it('возвращает длительность, пики, громкость и пик по выборкам', async () => {
    const channel = sine(3, 10 ** (-20 / 20));
    const close = stubAudioContext(() => Promise.resolve(fakeBuffer([channel, channel])));

    const result = await analyzeAudioFile(new Blob(['audio']));

    expect(result.durationSec).toBeCloseTo(3, 5);
    expect(result.peaks).toHaveLength(PEAK_BUCKETS);
    expect(Math.max(...result.peaks)).toBe(1);
    expect(result.lufs).toBeCloseTo(-20, 0);
    expect(result.peakDb).toBeCloseTo(-20, 0);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('тишина не даёт −Infinity (его нельзя сохранить в JSON): подставляются границы шкалы', async () => {
    const silent = new Float32Array(48000);
    stubAudioContext(() => Promise.resolve(fakeBuffer([silent])));
    const result = await analyzeAudioFile(new Blob(['audio']));
    expect(result.lufs).toBe(-70);
    expect(result.peakDb).toBe(-120);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('файл, который браузер не смог декодировать → ошибка 415 с понятным текстом', async () => {
    const close = stubAudioContext(() => Promise.reject(new DOMException('EncodingError')));
    await expect(analyzeAudioFile(new Blob(['мусор']))).rejects.toMatchObject({
      status: 415,
      code: 'UNSUPPORTED_AUDIO',
      message: expect.stringContaining('Не удалось прочитать аудио') as string,
    });
    expect(close).toHaveBeenCalledTimes(1); // контекст освобождается и при ошибке
  });
});
