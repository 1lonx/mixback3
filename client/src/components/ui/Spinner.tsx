import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: number;
  /** Подпись для скринридера. Пустая строка — спиннер декоративный (рядом уже есть текст). */
  label?: string;
}

export function Spinner({ size = 24, label = 'Загрузка…' }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
