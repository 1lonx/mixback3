import { ApiError } from '../errors';
import { computePeaks, samplePeakDb } from './peaks';
import { measureLoudness } from './loudness';

export interface AudioAnalysis {
  durationSec: number;
  peaks: number[];
  lufs: number;
  peakDb: number;
}

export const PEAK_BUCKETS = 800;

export async function analyzeAudioFile(file: Blob): Promise<AudioAnalysis> {
  const Ctx = window.AudioContext;
  const buffer = await file.arrayBuffer();
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(buffer);
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) =>
      decoded.getChannelData(i),
    );
    const lufs = measureLoudness(channels, decoded.sampleRate);
    const peakDb = samplePeakDb(channels);
    return {
      durationSec: decoded.duration,
      peaks: computePeaks(channels, PEAK_BUCKETS),
      lufs: Number.isFinite(lufs) ? Math.round(lufs * 10) / 10 : -70,
      peakDb: Number.isFinite(peakDb) ? Math.round(peakDb * 10) / 10 : -120,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      415,
      'UNSUPPORTED_AUDIO',
      'Не удалось прочитать аудио. Проверьте, что файл не повреждён и это mp3, wav, ogg, flac или m4a.',
    );
  } finally {
    void ctx.close();
  }
}
