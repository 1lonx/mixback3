import { useState, type SyntheticEvent } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { isSerializedError, serializeError, type FieldErrors } from '../../lib/errors';
import { formatTime, parseTime } from '../../lib/format';
import { commentSchema, parseWith } from '../../lib/schemas';
import { pushToast } from '../toasts/toastsSlice';
import { addComment } from './commentsSlice';
import styles from './CommentComposer.module.css';

interface CommentComposerProps {
  versionId: string;
  /** Текущая позиция плеера, сек. */
  currentTime: number;
  durationSec: number;
}

/**
 * Форма новой правки. Таймкод «следует» за плеером, пока пользователь не начал печатать:
 * после первой буквы он фиксируется, иначе во время набора он бы убегал вперёд.
 */
export function CommentComposer({ versionId, currentTime, durationSec }: CommentComposerProps) {
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const [frozenTime, setFrozenTime] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const timeText = frozenTime ?? formatTime(currentTime);

  const handleText = (value: string) => {
    if (frozenTime === null && value !== '') setFrozenTime(formatTime(currentTime));
    setText(value);
    setErrors((prev) => ({ ...prev, text: '' }));
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();

    const timeSec = parseTime(timeText);
    if (timeSec === null) {
      setErrors({ timeSec: 'Формат времени — м:сс, например 1:22' });
      return;
    }
    const parsed = parseWith(commentSchema, { timeSec, text });
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    if (parsed.data.timeSec > durationSec) {
      setErrors({ timeSec: `Трек длится ${formatTime(durationSec)}` });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await dispatch(addComment({ versionId, input: parsed.data })).unwrap();
      setText('');
      setFrozenTime(null);
      dispatch(pushToast('success', `Правка на ${formatTime(parsed.data.timeSec)} добавлена`));
    } catch (error) {
      const failure = isSerializedError(error) ? error : serializeError(error);
      if (failure.fieldErrors) setErrors(failure.fieldErrors);
      else dispatch(pushToast('error', failure.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => void submit(event)}
      aria-label="Новая правка"
    >
      <div className={styles.row}>
        <div className={styles.time}>
          <Input
            label="Таймкод"
            name="timeSec"
            value={timeText}
            onChange={(event) => {
              setFrozenTime(event.target.value);
              setErrors((prev) => ({ ...prev, timeSec: '' }));
            }}
            error={errors.timeSec}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div className={styles.text}>
          <Textarea
            label="Что поправить"
            name="text"
            rows={2}
            value={text}
            onChange={(event) => handleText(event.target.value)}
            error={errors.text}
            placeholder="Например: бочка бубнит, подрезать низ"
            hint={frozenTime === null ? 'Таймкод берётся из плеера' : undefined}
          />
        </div>
      </div>
      <Button type="submit" loading={submitting} className={styles.submit}>
        Добавить правку
      </Button>
    </form>
  );
}
