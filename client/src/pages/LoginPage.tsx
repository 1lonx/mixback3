import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '../app/hooks';
import { Card } from '../components/ui/Card';
import { selectUser } from '../features/auth/authSlice';
import { AuthForm } from '../features/auth/AuthForm';
import { HeroWave } from '../features/auth/HeroWave';
import { safeInternalPath } from '../lib/sanitize';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './LoginPage.module.css';

interface LocationState {
  from?: { pathname: string; search?: string };
}

export function LoginPage() {
  useDocumentTitle('Вход');
  const user = useAppSelector(selectUser);
  const location = useLocation();

  if (user) {
    const from = (location.state as LocationState | null)?.from;
    return (
      <Navigate to={safeInternalPath(from && `${from.pathname}${from.search ?? ''}`)} replace />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <HeroWave />
        <h1>Фидбэк на сведение — на таймкодах волны</h1>
        <p>
          Загрузите микс, отправьте ссылку артисту и получите правки, привязанные к секундам трека.
          Версии, A/B по громкости и чек-лист правок — в одном месте.
        </p>
      </div>
      <Card className={styles.card} aria-labelledby="auth-title">
        <h2 id="auth-title" className={styles.cardTitle}>
          Добро пожаловать
        </h2>
        <AuthForm />
      </Card>
    </div>
  );
}
