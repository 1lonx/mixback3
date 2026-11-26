import type { KeyboardEvent, RefObject } from 'react';
import { Spinner } from '../../components/ui/Spinner';
import { cx } from '../../lib/cx';
import { formatTime } from '../../lib/format';
import type { Comment } from '../../types/domain';
import type { PlayerControls } from './usePlayer';
import styles from './Waveform.module.css';

const SEEK_STEP_SEC = 5;

interface WaveformProps {
  containerRef: RefObject<HTMLDivElement | null>;
  controls: PlayerControls;
  currentTime: number;
  duration: number;
  ready: boolean;
  error: string | null;
  comments: readonly Comment[];
}

/**
 * Волна + дорожка с флажками правок.
 * Сама волна — slider (доступен с клавиатуры), флажки — отдельные кнопки над ней:
 * интерактивные элементы нельзя вкладывать в slider.
 */
export function Waveform({
  containerRef,
  controls,
  currentTime,
  duration,
  ready,
  error,
  comments,
}: WaveformProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowRight':
        controls.skip(SEEK_STEP_SEC);
        break;
      case 'ArrowLeft':
        controls.skip(-SEEK_STEP_SEC);
        break;
      case 'Home':
        controls.seek(0);
        break;
      case 'End':
        controls.seek(duration);
        break;
      case ' ':
        controls.toggle();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className={styles.root}>
      <ol className={styles.markers} aria-label="Правки на таймкодах">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className={styles.markerItem}
            style={{
              left: `${duration > 0 ? Math.min(100, (comment.timeSec / duration) * 100) : 0}%`,
            }}
          >
            <button
              type="button"
              className={cx(styles.marker, comment.resolved && styles.resolved)}
              onClick={() => controls.seek(comment.timeSec)}
              aria-label={`Правка на ${formatTime(comment.timeSec)}${comment.resolved ? ' (решена)' : ''}: ${comment.text}`}
              title={`${formatTime(comment.timeSec)} — ${comment.text}`}
            />
          </li>
        ))}
      </ol>

      <div
        className={styles.wave}
        role="slider"
        tabIndex={0}
        aria-label="Позиция воспроизведения"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} из ${formatTime(duration)}`}
        onKeyDown={handleKeyDown}
      >
        <div ref={containerRef} className={styles.canvas} />
        {!ready && !error && (
          <div className={styles.overlay} role="status">
            <Spinner label="" />
            Загружаем волну…
          </div>
        )}
        {error && (
          <div className={cx(styles.overlay, styles.overlayError)} role="alert">
            Не удалось загрузить аудио: {error}
          </div>
        )}
      </div>
    </div>
  );
}
