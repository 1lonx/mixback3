import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Avatar } from '../components/ui/Avatar';
import { buttonClassName } from '../components/ui/buttonClassName';
import { Card } from '../components/ui/Card';
import { ErrorState, Skeleton } from '../components/ui/States';
import { selectUser } from '../features/auth/authSlice';
import {
  fetchProfile,
  selectProfile,
  selectProfileError,
  selectProfileStatus,
} from '../features/profile/profileSlice';
import { StatsGrid } from '../features/profile/StatsGrid';
import { formatDate } from '../lib/format';
import { useReveal } from '../lib/motion';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  useDocumentTitle('Профиль');
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const profile = useAppSelector(selectProfile);
  const status = useAppSelector(selectProfileStatus);
  const error = useAppSelector(selectProfileError);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void dispatch(fetchProfile());
  }, [dispatch]);

  useReveal(rootRef, '[data-reveal]', [Boolean(profile)]);

  if (status === 'failed' && error && !profile) {
    return (
      <ErrorState
        title="Не удалось загрузить профиль"
        message={error.message}
        onRetry={() => void dispatch(fetchProfile())}
      />
    );
  }

  if (!profile || !user) {
    return (
      <div className={styles.page} aria-busy="true" role="status" aria-label="Загружаем профиль">
        <Skeleton height={96} />
        <Skeleton height={90} />
        <Skeleton height={220} />
      </div>
    );
  }

  return (
    <div className={styles.page} ref={rootRef}>
      <header className={styles.hero} data-reveal>
        <Avatar name={user.name} size={72} />
        <div className={styles.heroText}>
          <h1>{user.name}</h1>
          <p className={styles.muted}>{user.email}</p>
          <p className={styles.muted}>В Mixback с {formatDate(profile.createdAt)}</p>
        </div>
      </header>

      <div data-reveal>
        <StatsGrid stats={profile.stats} />
      </div>

      <Card className={styles.engineerCard} aria-labelledby="engineer-heading" data-reveal>
        <div>
          <h2 id="engineer-heading">Звукорежиссёр в Mixback</h2>
          <p className={styles.muted}>
            Принимайте заказы: анкета, услуги с ценой и портфолио, которое можно послушать.
          </p>
        </div>
        <Link to="/profile/engineer" className={buttonClassName({ variant: 'secondary' })}>
          Моя анкета
        </Link>
      </Card>

      <Card className={styles.engineerCard} aria-labelledby="settings-heading" data-reveal>
        <div>
          <h2 id="settings-heading">Настройки аккаунта</h2>
          <p className={styles.muted}>Имя, пароль, тема оформления и удаление аккаунта.</p>
        </div>
        <Link to="/settings" className={buttonClassName({ variant: 'secondary' })}>
          Открыть настройки
        </Link>
      </Card>
    </div>
  );
}
