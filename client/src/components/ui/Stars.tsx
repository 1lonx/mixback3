import { pluralize } from '../../lib/format';
import styles from './Stars.module.css';

interface StarsProps {
  value: number | null;
  count?: number;
}

const formatRating = (value: number) => value.toFixed(1).replace('.', ',');

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
