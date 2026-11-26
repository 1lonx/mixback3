import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { cx } from '../../lib/cx';
import { dismissToast, selectToasts, type Toast } from './toastsSlice';
import styles from './ToastRegion.module.css';

const LIFETIME_MS: Record<Toast['kind'], number> = { success: 4000, info: 5000, error: 8000 };

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), LIFETIME_MS[toast.kind]);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.kind]);

  return (
    <li className={cx(styles.toast, styles[toast.kind])}>
      <span>{toast.message}</span>
      <button
        type="button"
        className={styles.close}
        aria-label="Закрыть уведомление"
        onClick={() => dispatch(dismissToast(toast.id))}
      >
        ×
      </button>
    </li>
  );
}

/** Контейнер объявляется скринридером (aria-live), поэтому новые уведомления зачитываются сами. */
export function ToastRegion() {
  const toasts = useAppSelector(selectToasts);
  return (
    <ul className={styles.region} aria-live="polite" aria-label="Уведомления">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ul>
  );
}
