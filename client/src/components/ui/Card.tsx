import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import styles from './Card.module.css';

interface CardProps extends ComponentProps<'section'> {
  /** Подсвечивает карточку при наведении — для кликабельных карточек. */
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...rest }: CardProps) {
  return (
    <section {...rest} className={cx(styles.card, interactive && styles.interactive, className)} />
  );
}
