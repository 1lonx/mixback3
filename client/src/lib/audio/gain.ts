export function referenceLufs(lufsValues: readonly number[]): number | null {
  const finite = lufsValues.filter((v) => Number.isFinite(v));
  return finite.length > 0 ? Math.min(...finite) : null;
}

export function matchGain(lufs: number, target: number | null): number {
  if (target === null || !Number.isFinite(lufs)) return 1;
  const gain = 10 ** ((target - lufs) / 20);
  return Math.min(1, Math.max(0, gain));
}
