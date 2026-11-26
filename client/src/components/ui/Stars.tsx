import { pluralize } from '../../lib/format';
import styles from './Stars.module.css';

interface StarsProps {
  /** Средняя оценка; null — отзывов ещё нет. */
  value: number | null;
  /** Число отзывов за средней оценкой. Не указано — это одна оценка (под самим отзывом). */
  count?: number;
}

const formatRating = (value: number) => value.toFixed(1).replace('.', ',');

/** Компактный рейтинг «★ 4,8 (12)». Для скринридера — одна фраза, без разбора по символам. */
export function Stars({ value, count }: StarsProps) {
  if (value === null) return <span className={styles.none}>Пока нет отзывов</span>;
  const label =
    count === undefined
      ? `Оценка ${value} из 5`
      : `Рейтинг ${formatRating(value)} из 5, ${pluralize(count, ['отзыв', 'отзыва', 'отзывов'])}`;
  return (
    <span className={styles.stars} role="img" aria-label={label}>
      <span className={styles.star} aria-hidden="true">
        ★
      </span>
      <span aria-hidden="true" className={styles.value}>
        {count === undefined ? value : formatRating(value)}
      </span>
      {count !== undefined && (
        <span aria-hidden="true" className={styles.count}>
          ({count})
        </span>
      )}
    </span>
  );
}
