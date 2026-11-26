/**
 * A/B-сравнение «по-честному»: версии с разной громкостью выравниваются,
 * иначе более громкая всегда кажется лучше.
 *
 * Элемент <audio> умеет только ослаблять звук (volume ≤ 1), поэтому за эталон
 * берём самую тихую версию проекта — остальные притихают до её уровня.
 */
export function referenceLufs(lufsValues: readonly number[]): number | null {
  const finite = lufsValues.filter((v) => Number.isFinite(v));
  return finite.length > 0 ? Math.min(...finite) : null;
}

/** Линейный коэффициент громкости (0..1) для выравнивания `lufs` к `target`. */
export function matchGain(lufs: number, target: number | null): number {
  if (target === null || !Number.isFinite(lufs)) return 1;
  const gain = 10 ** ((target - lufs) / 20);
  return Math.min(1, Math.max(0, gain));
}
