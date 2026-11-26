import { useEffect, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Card } from '../../components/ui/Card';
import { matchGain, referenceLufs } from '../../lib/audio/gain';
import { ChecklistPanel } from '../checklist/ChecklistPanel';
import { CommentComposer } from '../comments/CommentComposer';
import { CommentList } from '../comments/CommentList';
import { fetchComments, selectAllComments } from '../comments/commentsSlice';
import type { Role, Version } from '../../types/domain';
import { Transport } from './Transport';
import { useAudioUrl } from './useAudioUrl';
import { usePlayer } from './usePlayer';
import { Waveform } from './Waveform';
import styles from './VersionWorkspace.module.css';

interface VersionWorkspaceProps {
  version: Version;
  versions: readonly Version[];
  role: Role;
  userId: string;
  /** Дополнительные блоки боковой колонки (участники, загрузка версии). */
  aside?: ReactNode;
}

/**
 * Рабочая область одной версии. Владеет плеером и раздаёт его управление
 * списку правок и чек-листу: клик по таймкоду в любом из них перематывает волну.
 */
export function VersionWorkspace({
  version,
  versions,
  role,
  userId,
  aside,
}: VersionWorkspaceProps) {
  const dispatch = useAppDispatch();
  const comments = useAppSelector(selectAllComments);
  const [matchEnabled, setMatchEnabled] = useState(true);

  useEffect(() => {
    void dispatch(fetchComments(version.id));
  }, [dispatch, version.id]);

  // Выравнивание имеет смысл, только когда есть что сравнивать.
  const matchTarget = versions.length > 1 ? referenceLufs(versions.map((v) => v.lufs)) : null;
  const volume = matchEnabled ? matchGain(version.lufs, matchTarget) : 1;

  const { url, error: urlError } = useAudioUrl(version);
  const player = usePlayer({
    url,
    peaks: version.peaks,
    durationSec: version.durationSec,
    volume,
  });

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <Card aria-label={`Плеер, версия ${version.number}`} className={styles.player}>
          <Waveform
            containerRef={player.containerRef}
            controls={player.controls}
            currentTime={player.currentTime}
            duration={player.duration}
            ready={player.ready}
            error={player.error ?? urlError?.message ?? null}
            comments={comments}
          />
          <Transport
            controls={player.controls}
            playing={player.playing}
            ready={player.ready}
            currentTime={player.currentTime}
            duration={player.duration}
            version={version}
            matchTarget={matchTarget}
            matchEnabled={matchEnabled}
            onMatchChange={setMatchEnabled}
          />
        </Card>

        <Card aria-labelledby="composer-title" className={styles.block}>
          <h2 id="composer-title">Новая правка</h2>
          {/* key: форма и список начинают с чистого листа для каждой версии, плеер — нет. */}
          <CommentComposer
            key={version.id}
            versionId={version.id}
            currentTime={player.currentTime}
            durationSec={version.durationSec}
          />
        </Card>

        <Card aria-labelledby="comments-title" className={styles.block}>
          <h2 id="comments-title">Правки</h2>
          <CommentList
            key={version.id}
            versionId={version.id}
            userId={userId}
            role={role}
            currentTime={player.currentTime}
            onSeek={player.controls.seek}
          />
        </Card>
      </div>

      <aside className={styles.aside} aria-label="Дополнительно">
        {role === 'owner' && (
          <ChecklistPanel key={version.id} versionId={version.id} onSeek={player.controls.seek} />
        )}
        {aside}
      </aside>
    </div>
  );
}
