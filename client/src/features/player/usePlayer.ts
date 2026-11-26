import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { clamp } from '../../lib/format';
import { cssColor, useResolvedTheme } from '../../lib/theme';

interface PlayerOptions {
  /** Адрес аудио. null — пока не получен. */
  url: string | null;
  /** Готовые пики: волна рисуется мгновенно, без декодирования файла. */
  peaks: number[] | null;
  durationSec: number;
  /** Громкость 0..1 (для выравнивания версий по LUFS). */
  volume: number;
}

interface PlayerState {
  /** Адрес, для которого волна готова: «готовность» выводится из него, а не хранится флагом. */
  readyUrl: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  failure: { url: string; message: string } | null;
}

export interface PlayerControls {
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
}

const TIME_STEP = 0.25;

/**
 * Обёртка над wavesurfer.js. Один экземпляр живёт, пока открыт плеер;
 * при смене версии грузится новый файл, а позиция и состояние «играет»
 * сохраняются — так версии можно сравнивать на одном и том же месте (A/B).
 */
export function usePlayer({ url, peaks, durationSec, volume }: PlayerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const resumeRef = useRef<{ time: number; play: boolean } | null>(null);
  const volumeRef = useRef(volume);
  /** Адрес, который грузится прямо сейчас: по нему отличаем свежие события от запоздалых. */
  const loadingUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<PlayerState>({
    readyUrl: null,
    playing: false,
    currentTime: 0,
    duration: durationSec,
    failure: null,
  });

  // 1. Создаём плеер один раз.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ws = WaveSurfer.create({
      container,
      height: 112,
      waveColor: cssColor('--wave', '#5f5f63'),
      progressColor: cssColor('--wave-progress', '#f2f2f3'),
      cursorColor: cssColor('--focus', '#7aa7ff'),
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      normalize: true,
    });
    wsRef.current = ws;

    const unsubscribe = [
      ws.on('ready', (duration) => {
        const resume = resumeRef.current;
        resumeRef.current = null;
        ws.setVolume(volumeRef.current);
        if (resume) {
          ws.setTime(Math.min(resume.time, duration));
          if (resume.play) void ws.play();
        }
        setState((s) => ({
          ...s,
          duration,
          failure: null,
          readyUrl: loadingUrlRef.current ?? s.readyUrl,
        }));
      }),
      ws.on('play', () => setState((s) => ({ ...s, playing: true }))),
      ws.on('pause', () => setState((s) => ({ ...s, playing: false }))),
      ws.on('timeupdate', (time) =>
        setState((s) =>
          Math.abs(s.currentTime - time) >= TIME_STEP ? { ...s, currentTime: time } : s,
        ),
      ),
      ws.on('error', (error) =>
        setState((s) => ({
          ...s,
          failure: { url: loadingUrlRef.current ?? '', message: error.message },
        })),
      ),
    ];

    return () => {
      unsubscribe.forEach((off) => off());
      ws.destroy();
      wsRef.current = null;
    };
  }, []);

  // 2. Загружаем файл при смене версии.
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !url) return;
    resumeRef.current = { time: ws.getCurrentTime(), play: ws.isPlaying() };
    loadingUrlRef.current = url;
    ws.load(url, peaks ? [Float32Array.from(peaks)] : undefined, durationSec).catch(() => {
      // Ошибку покажет обработчик события 'error'.
    });
  }, [url, peaks, durationSec]);

  // 2b. Смена темы перекрашивает волну без перезагрузки аудио.
  const theme = useResolvedTheme();
  useEffect(() => {
    wsRef.current?.setOptions({
      waveColor: cssColor('--wave', '#5f5f63'),
      progressColor: cssColor('--wave-progress', '#f2f2f3'),
      cursorColor: cssColor('--focus', '#7aa7ff'),
    });
  }, [theme]);

  // 3. Громкость применяется сразу и запоминается для следующей загрузки.
  useEffect(() => {
    volumeRef.current = volume;
    wsRef.current?.setVolume(volume);
  }, [volume]);

  const seek = useCallback((seconds: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    const duration = ws.getDuration();
    ws.setTime(duration > 0 ? clamp(seconds, 0, duration) : Math.max(0, seconds));
  }, []);

  const toggle = useCallback(() => void wsRef.current?.playPause(), []);
  const skip = useCallback(
    (delta: number) => {
      if (wsRef.current) seek(wsRef.current.getCurrentTime() + delta);
    },
    [seek],
  );
  const controls = useMemo<PlayerControls>(() => ({ toggle, seek, skip }), [toggle, seek, skip]);

  const failed = state.failure !== null && state.failure.url === (url ?? '');

  return {
    containerRef,
    controls,
    ready: url !== null && state.readyUrl === url,
    playing: state.playing,
    currentTime: state.currentTime,
    duration: state.duration,
    error: failed ? (state.failure?.message ?? null) : null,
  };
}
