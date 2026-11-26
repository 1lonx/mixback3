import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { buttonClassName } from '../components/ui/buttonClassName';
import { ErrorState, Skeleton } from '../components/ui/States';
import { selectUser } from '../features/auth/authSlice';
import { EngineerForm } from '../features/engineers/EngineerForm';
import {
  fetchMyEngineer,
  saveEngineer,
  selectMine,
  selectMineError,
  selectMineStatus,
} from '../features/engineers/mineSlice';
import { CoverUploader } from '../features/engineers/CoverUploader';
import { PortfolioManager } from '../features/engineers/PortfolioManager';
import { pushToast } from '../features/toasts/toastsSlice';
import { errorMessage, isSerializedError, type FieldErrors } from '../lib/errors';
import type { EngineerInput } from '../lib/schemas';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './EngineerEditPage.module.css';

export function EngineerEditPage() {
  useDocumentTitle('Анкета звукорежиссёра');
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const mine = useAppSelector(selectMine);
  const status = useAppSelector(selectMineStatus);
  const error = useAppSelector(selectMineError);
  const [serverErrors, setServerErrors] = useState<FieldErrors>();

  useEffect(() => {
    void dispatch(fetchMyEngineer());
  }, [dispatch]);

  if (status === 'failed' && error) {
    return (
      <ErrorState
        title="Не удалось загрузить анкету"
        message={error.message}
        onRetry={() => void dispatch(fetchMyEngineer())}
      />
    );
  }

  if (status !== 'succeeded') {
    return (
      <div className={styles.page} aria-busy="true" role="status" aria-label="Загружаем анкету">
        <Skeleton height={260} />
        <Skeleton height={200} />
      </div>
    );
  }

  const save = async (input: EngineerInput) => {
    setServerErrors(undefined);
    try {
      await dispatch(saveEngineer(input)).unwrap();
      dispatch(
        pushToast(
          'success',
          input.published
            ? 'Анкета сохранена и видна в каталоге'
            : 'Анкета сохранена (скрыта из каталога)',
        ),
      );
    } catch (failure) {
      if (isSerializedError(failure) && failure.fieldErrors) setServerErrors(failure.fieldErrors);
      dispatch(pushToast('error', errorMessage(failure, 'Не удалось сохранить анкету')));
    }
  };

  const profile = mine?.profile ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Анкета звукорежиссёра</h1>
          <p className={styles.muted}>
            {profile
              ? 'Так вас видят заказчики. Изменения появятся в каталоге сразу после сохранения.'
              : 'Расскажите о себе, добавьте услуги и работы — после этого вам смогут заказывать.'}
          </p>
        </div>
        {user && profile?.published && (
          <Link to={`/engineers/${user.id}`} className={buttonClassName({ variant: 'secondary' })}>
            Посмотреть анкету
          </Link>
        )}
      </header>

      {/* Ключ по времени сохранения: после сохранения форма берёт ID услуг, присвоенные сервером. */}
      <EngineerForm
        key={profile?.updatedAt ?? 'new'}
        profile={profile}
        onSubmit={save}
        serverErrors={serverErrors}
      />

      {profile ? (
        <>
          <CoverUploader coverUrl={profile.coverUrl ?? null} />
          <PortfolioManager tracks={mine?.portfolio ?? []} />
        </>
      ) : (
        <p className={styles.muted}>
          Обложка и портфолио откроются после первого сохранения анкеты.
        </p>
      )}
    </div>
  );
}
