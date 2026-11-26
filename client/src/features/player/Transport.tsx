import { Button } from '../../components/ui/Button';
import { formatDb, formatLufs, formatTime } from '../../lib/format';
import type { Version } from '../../types/domain';
import type { PlayerControls } from './usePlayer';
import styles from './Transport.module.css';

interface TransportProps {
  controls: PlayerControls;
  playing: boolean;
  ready: boolean;
  currentTime: number;
  duration: number;
  version: Version;
  matchTarget: number | null;
  matchEnabled: boolean;
  onMatchChange: (enabled: boolean) => void;
}

export function Transport({
  controls,
  playing,
  ready,
  currentTime,
  duration,
  version,
  matchTarget,
  matchEnabled,
  onMatchChange,
}: TransportProps) {
  return (
    <div className={styles.transport}>
      <div className={styles.buttons}>
        <Button variant="ghost" size="sm" onClick={() => controls.skip(-5)} aria-label="−5 с назад">
          −5 с
        </Button>
        <Button onClick={controls.toggle} disabled={!ready} aria-pressed={playing}>
          {playing ? 'Пауза' : 'Играть'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => controls.skip(5)} aria-label="+5 с вперёд">
          +5 с
        </Button>
        <output className={styles.time} aria-label="Время">
          {formatTime(currentTime)} / {formatTime(duration)}
        </output>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>Громкость</dt>
          <dd>{formatLufs(version.lufs)}</dd>
        </div>
        <div>
          <dt>Пик</dt>
          <dd>{formatDb(version.peakDb)}</dd>
        </div>
      </dl>

      <label className={styles.match}>
        <input
          type="checkbox"
          checked={matchEnabled}
          disabled={matchTarget === null}
          onChange={(event) => onMatchChange(event.target.checked)}
        />
        <span>
          Выровнять громкость версий
          {matchTarget !== null && (
            <span className={styles.matchHint}> до {formatLufs(matchTarget)}</span>
          )}
        </span>
      </label>
    </div>
  );
}
