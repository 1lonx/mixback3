import { useRef, useState, type SyntheticEvent } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { analyzeAudioFile } from '../../lib/audio/analyze';
import { fileLooksLikeAudio } from '../../lib/audio/sniff';
import { errorMessage, isSerializedError, type FieldErrors } from '../../lib/errors';
import { formatFileSize, formatTime } from '../../lib/format';
import {
  MAX_AUDIO_BYTES,
  MAX_PORTFOLIO_TRACKS,
  parseWith,
  trackSchema,
  validateAudioFile,
} from '../../lib/schemas';
import { GENRES, type Genre, type PortfolioTrack } from '../../types/domain';
import { pushToast } from '../toasts/toastsSlice';
import { addTrack, removeTrack } from './mineSlice';
import styles from './PortfolioManager.module.css';

type Phase = 'idle' | 'analyzing' | 'saving';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Добавить работу',
  analyzing: 'Анализируем звук…',
  saving: 'Сохраняем…',
};

export function PortfolioManager({ tracks }: { tracks: readonly PortfolioTrack[] }) {
  const dispatch = useAppDispatch();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre>(GENRES[0]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [removing, setRemoving] = useState<string | null>(null);

  const busy = phase !== 'idle';
  const full = tracks.length >= MAX_PORTFOLIO_TRACKS;

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(trackSchema, { title, genre, description });
    const next: FieldErrors = parsed.success ? {} : { ...parsed.errors };

    const problem = file ? validateAudioFile(file) : 'Выберите аудиофайл';
    if (problem) next.file = problem;
    if (!file || !parsed.success || problem) {
      setErrors(next);
      return;
    }
    if (!(await fileLooksLikeAudio(file))) {
      setErrors({
        file: 'Содержимое файла не похоже на аудио. Проверьте, что это настоящий mp3, wav, ogg, flac или m4a.',
      });
      return;
    }

    setErrors({});
    try {
      setPhase('analyzing');
      const analysis = await analyzeAudioFile(file);
      setPhase('saving');
      await dispatch(addTrack({ ...parsed.data, file, fileName: file.name, analysis })).unwrap();
      dispatch(pushToast('success', 'Работа добавлена в портфолио'));
      setFile(null);
      setTitle('');
      setDescription('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (error) {
      if (isSerializedError(error) && error.fieldErrors) setErrors(error.fieldErrors);
      dispatch(pushToast('error', errorMessage(error, 'Не удалось добавить работу')));
    } finally {
      setPhase('idle');
    }
  };

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await dispatch(removeTrack(id)).unwrap();
    } catch (error) {
      dispatch(pushToast('error', errorMessage(error, 'Не удалось удалить работу')));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Card className={styles.panel} aria-labelledby="portfolio-heading">
      <h2 id="portfolio-heading">
        Портфолио{' '}
        <span className={styles.count}>
          {tracks.length}/{MAX_PORTFOLIO_TRACKS}
        </span>
      </h2>

      {tracks.length === 0 ? (
        <p className={styles.muted}>
          Загрузите до {MAX_PORTFOLIO_TRACKS} работ: заказчики сначала слушают, потом пишут.
        </p>
      ) : (
        <ul className={styles.list}>
          {tracks.map((track) => (
            <li key={track.id} className={styles.track}>
              <div className={styles.trackText}>
                <strong>{track.title}</strong>
                <span className={styles.muted}>
                  <Badge>{track.genre}</Badge> {formatTime(track.durationSec)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                loading={removing === track.id}
                disabled={removing !== null}
                aria-label={`Удалить работу «${track.title}»`}
                onClick={() => void remove(track.id)}
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className={styles.muted}>Достигнут предел. Удалите работу, чтобы добавить новую.</p>
      ) : (
        <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
          <Input
            ref={fileInput}
            label="Аудиофайл"
            type="file"
            name="audio"
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
            disabled={busy}
            error={errors.file}
            hint={`mp3, wav, ogg, flac, m4a — до ${formatFileSize(MAX_AUDIO_BYTES)}`}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setErrors((prev) => ({ ...prev, file: '' }));
            }}
          />
          <Input
            label="Название работы"
            name="title"
            value={title}
            maxLength={60}
            disabled={busy}
            error={errors.title}
            onChange={(event) => {
              setTitle(event.target.value);
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
          />
          <Select
            label="Жанр"
            name="genre"
            value={genre}
            disabled={busy}
            onChange={(event) => setGenre(event.target.value as Genre)}
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <Textarea
            label="Что вы делали"
            name="description"
            value={description}
            disabled={busy}
            error={errors.description}
            hint={`${description.length}/200 · необязательно`}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button type="submit" variant="secondary" loading={busy}>
            {PHASE_LABEL[phase]}
          </Button>
        </form>
      )}
    </Card>
  );
}
