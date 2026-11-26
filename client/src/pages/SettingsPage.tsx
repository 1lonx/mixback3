import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { buttonClassName } from '../components/ui/buttonClassName';
import { ErrorState, Skeleton } from '../components/ui/States';
import { selectUser } from '../features/auth/authSlice';
import { NameForm, PasswordForm } from '../features/profile/AccountForms';
import {
  fetchProfile,
  selectProfile,
  selectProfileError,
  selectProfileStatus,
} from '../features/profile/profileSlice';
import { AppearanceCard, DangerZone, SessionCard } from '../features/profile/SettingsCards';
import { useReveal } from '../lib/motion';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './ProfilePage.module.css';

/** Настройки аккаунта: имя, пароль, оформление, сессия и удаление. Данные профиля — на странице профиля. */
export function SettingsPage() {
  useDocumentTitle('Настройки');
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
        title="Не удалось загрузить настройки"
        message={error.message}
        onRetry={() => void dispatch(fetchProfile())}
      />
    );
  }

  if (!profile || !user) {
    return (
      <div className={styles.page} aria-busy="true" role="status" aria-label="Загружаем настройки">
        <Skeleton height={60} />
        <Skeleton height={220} />
        <Skeleton height={220} />
      </div>
    );
  }

  return (
    <div className={styles.page} ref={rootRef}>
      <header className={styles.settingsHead} data-reveal>
        <h1>Настройки</h1>
        <Link to="/profile" className={buttonClassName({ variant: 'secondary' })}>
          К профилю
        </Link>
      </header>

      <div className={styles.columns}>
        <div className={styles.column} data-reveal>
          <NameForm currentName={user.name} />
          <AppearanceCard />
        </div>
        <div className={styles.column} data-reveal>
          <PasswordForm />
          <SessionCard
            createdAt={profile.session.createdAt}
            expiresAt={profile.session.expiresAt}
          />
        </div>
      </div>

      <div data-reveal>
        <DangerZone email={user.email} />
      </div>
    </div>
  );
}
