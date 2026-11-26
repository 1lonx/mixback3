import { useRef, useState } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { errorMessage } from '../../lib/errors';
import { compressImage } from '../../lib/image';
import { formatFileSize } from '../../lib/format';
import { MAX_IMAGE_BYTES, validateImageFile } from '../../lib/schemas';
import { pushToast } from '../toasts/toastsSlice';
import styles from './CoverUploader.module.css';
import { setCover } from './mineSlice';

export function CoverUploader({ coverUrl }: { coverUrl: string | null }) {
  const dispatch = useAppDispatch();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const apply = async (image: Blob | null, success: string) => {
    setBusy(true);
    try {
      await dispatch(setCover(image)).unwrap();
      dispatch(pushToast('success', success));
    } catch (failure) {
      dispatch(pushToast('error', errorMessage(failure, 'Не удалось сохранить обложку')));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (file: File | undefined) => {
    setError(undefined);
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    let compressed: Blob;
    try {
      setBusy(true);
      compressed = await compressImage(file);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось обработать картинку');
      return;
    } finally {
      setBusy(false);
    }
    await apply(compressed, 'Обложка обновлена');
    if (input.current) input.current.value = '';
  };

  return (
    <Card className={styles.panel} aria-labelledby="cover-heading">
      <h2 id="cover-heading">Обложка</h2>
      {coverUrl ? (
        <img className={styles.preview} src={coverUrl} alt="Текущая обложка анкеты" />
      ) : (
        <p className={styles.muted}>
          Добавьте картинку — анкета с обложкой заметнее в каталоге. Подойдёт скриншот проекта в DAW
          или фото студии.
        </p>
      )}
      <Input
        ref={input}
        label={coverUrl ? 'Заменить картинку' : 'Картинка'}
        type="file"
        name="cover"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        error={error}
        hint={`JPEG, PNG или WebP — до ${formatFileSize(MAX_IMAGE_BYTES)}, сожмём сами`}
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {coverUrl && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void apply(null, 'Обложка удалена')}
          >
            Удалить обложку
          </Button>
        </div>
      )}
    </Card>
  );
}
