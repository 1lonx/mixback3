import type { ReactNode } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';
import styles from './States.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** «Пустой результат»: объясняет, почему тут пусто, и предлагает следующий шаг. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <span className={styles.icon} aria-hidden="true">
        ∅
      </span>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.text}>{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/** «Ошибка»: сообщение объявляется скринридером, есть кнопка повтора. */
export function ErrorState({
  title = 'Не удалось загрузить данные',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className={styles.state} role="alert">
      <span className={`${styles.icon} ${styles.iconError}`} aria-hidden="true">
        !
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

/** «Загрузка» для небольших блоков. Для списков используйте <Skeleton />. */
export function LoadingState({ label = 'Загружаем…' }: { label?: string }) {
  return (
    <div className={styles.state} role="status" aria-live="polite">
      <Spinner label="" />
      <p className={styles.text}>{label}</p>
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%' }: { height?: number; width?: string }) {
  return <span className={styles.skeleton} style={{ height, width }} aria-hidden="true" />;
}
