type Listener = (...args: never[]) => void;

/**
 * Лёгкая замена wavesurfer.js для jsdom: в нём нет canvas и аудио.
 * Хранит список созданных экземпляров, чтобы тесты могли «нажимать» события плеера.
 */
export default class MockWaveSurfer {
  static instances: MockWaveSurfer[] = [];

  static create(options: Record<string, unknown>): MockWaveSurfer {
    const instance = new MockWaveSurfer(options);
    MockWaveSurfer.instances.push(instance);
    return instance;
  }

  static reset(): void {
    MockWaveSurfer.instances = [];
  }

  options: Record<string, unknown>;
  loadedUrl: string | null = null;
  volume = 1;
  time = 0;
  duration = 0;
  playing = false;
  destroyed = false;
  private listeners = new Map<string, Set<Listener>>();

  constructor(options: Record<string, unknown>) {
    this.options = options;
  }

  on(event: string, listener: Listener): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return () => set.delete(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners
      .get(event)
      ?.forEach((listener) => (listener as (...a: unknown[]) => void)(...args));
  }

  load(url: string, _peaks?: unknown, duration?: number): Promise<void> {
    this.loadedUrl = url;
    this.duration = duration ?? 0;
    return Promise.resolve().then(() => this.emit('ready', this.duration));
  }

  play(): Promise<void> {
    this.playing = true;
    this.emit('play');
    return Promise.resolve();
  }

  pause(): void {
    this.playing = false;
    this.emit('pause');
  }

  playPause(): Promise<void> {
    if (this.playing) this.pause();
    else void this.play();
    return Promise.resolve();
  }

  setTime(seconds: number): void {
    this.time = seconds;
    this.emit('timeupdate', seconds);
  }

  setOptions(options: Record<string, unknown>): void {
    this.options = { ...this.options, ...options };
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  getCurrentTime = () => this.time;
  getDuration = () => this.duration;
  isPlaying = () => this.playing;

  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
  }
}
