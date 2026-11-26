import { useRef, useState, type SyntheticEvent } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { analyzeAudioFile } from '../../lib/audio/analyze';
import { fileLooksLikeAudio } from '../../lib/audio/sniff';
import { errorMessage } from '../../lib/errors';
import { formatFileSize } from '../../lib/format';
import { MAX_AUDIO_BYTES, validateAudioFile } from '../../lib/schemas';
import type { Version } from '../../types/domain';
import { pushToast } from '../toasts/toastsSlice';
import { uploadVersion } from './projectSlice';
import styles from './UploadVersion.module.css';

interface UploadVersionProps {
  projectId: string;
  onUploaded: (version: Version) => void;
}

type Phase = 'idle' | 'analyzing' | 'saving';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Загрузить версию',
  analyzing: 'Анализируем звук…',
  saving: 'Сохраняем…',
};

export function UploadVersion({ projectId, onUploaded }: UploadVersionProps) {
  const dispatch = useAppDispatch();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [fileError, setFileError] = useState<string>();
  const [phase, setPhase] = useState<Phase>('idle');

  const busy = phase !== 'idle';

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!file) {
      setFileError('Выберите аудиофайл');
      return;
    }
    const problem = validateAudioFile(file);
    if (problem) {
      setFileError(problem);
      return;
    }

    if (!(await fileLooksLikeAudio(file))) {
      setFileError(
        'Содержимое файла не похоже на аудио. Проверьте, что это настоящий mp3, wav, ogg, flac или m4a.',
      );
      return;
    }

    try {
      setPhase('analyzing');
      const analysis = await analyzeAudioFile(file);
      setPhase('saving');
      const version = await dispatch(
        uploadVersion({ projectId, input: { file, fileName: file.name, note, analysis } }),
      ).unwrap();
      dispatch(pushToast('success', `Версия v${version.number} загружена`));
      setFile(null);
      setNote('');
      if (fileInput.current) fileInput.current.value = '';
      onUploaded(version);
    } catch (error) {
      dispatch(pushToast('error', errorMessage(error, 'Не удалось загрузить версию')));
    } finally {
      setPhase('idle');
    }
  };

  return (
    <Card aria-labelledby="upload-title" className={styles.panel}>
      <h2 id="upload-title">Новая версия</h2>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        <Input
          ref={fileInput}
          label="Аудиофайл"
          type="file"
          name="audio"
          accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
          disabled={busy}
          error={fileError}
          hint={`mp3, wav, ogg, flac, m4a — до ${formatFileSize(MAX_AUDIO_BYTES)}`}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setFileError(undefined);
          }}
        />
        <Input
          label="Что изменилось"
          name="note"
          value={note}
          maxLength={120}
          disabled={busy}
          placeholder="Например: вокал громче, подрезан низ"
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="submit" variant="secondary" loading={busy}>
          {PHASE_LABEL[phase]}
        </Button>
      </form>
    </Card>
  );
}
