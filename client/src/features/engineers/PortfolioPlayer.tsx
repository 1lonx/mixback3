import { useEffect, useRef, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { cx } from '../../lib/cx';
import { formatTime } from '../../lib/format';
import type { PortfolioTrack } from '../../types/domain';
import { useAudioUrl } from '../player/useAudioUrl';
import { usePlayer } from '../player/usePlayer';
import { Waveform } from '../player/Waveform';
import styles from './PortfolioPlayer.module.css';

interface StageProps {
  track: PortfolioTrack;
  autoPlay: boolean;
}

function Stage({ track, autoPlay }: StageProps) {
  const { url, error } = useAudioUrl(track);
  const player = usePlayer({ url, peaks: track.peaks, durationSec: track.durationSec, volume: 1 });
  const { ready, controls } = player;

  const startedRef = useRef(false);
  useEffect(() => {
    if (autoPlay && ready && !startedRef.current) {
      startedRef.current = true;
      controls.toggle();
    }
  }, [autoPlay, ready, controls]);

  return (
    <div className={styles.stage}>
      <Waveform
        containerRef={player.containerRef}
        controls={controls}
        currentTime={player.currentTime}
        duration={player.duration}
        ready={ready}
        error={error?.message ?? player.error}
        comments={[]}
      />
      <div className={styles.transport}>
        <Button onClick={controls.toggle} disabled={!ready} aria-pressed={player.playing}>
          {player.playing ? 'Пауза' : 'Играть'}
        </Button>
        <output className={styles.time} aria-label="Время">
          {formatTime(player.currentTime)} / {formatTime(player.duration)}
        </output>
      </div>
    </div>
  );
}

export function PortfolioPlayer({ tracks }: { tracks: readonly PortfolioTrack[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picked, setPicked] = useState(false);
  const selected = tracks.find((t) => t.id === selectedId) ?? tracks[0];

  if (!selected) return null;

  return (
    <div className={styles.root}>
      <Stage key={selected.id} track={selected} autoPlay={picked} />
      <ul className={styles.list} aria-label="Работы">
        {tracks.map((track) => {
          const active = track.id === selected.id;
          return (
            <li key={track.id}>
              <button
                type="button"
                className={cx(styles.row, active && styles.active)}
                aria-pressed={active}
                onClick={() => {
                  setSelectedId(track.id);
                  setPicked(true);
                }}
              >
                <span className={styles.title}>{track.title}</span>
                <Badge>{track.genre}</Badge>
                <span className={styles.duration}>{formatTime(track.durationSec)}</span>
                {track.description && <span className={styles.text}>{track.description}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
