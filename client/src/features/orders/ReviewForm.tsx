import { useState, type SyntheticEvent } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Field';
import { cx } from '../../lib/cx';
import { errorMessage, type FieldErrors } from '../../lib/errors';
import { parseWith, reviewSchema } from '../../lib/schemas';
import { pushToast } from '../toasts/toastsSlice';
import { submitReview } from './orderSlice';
import styles from './ReviewForm.module.css';

const RATING_HINTS = ['Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'] as const;

/** Оценка 1–5 на радиокнопках: стрелки и скринридер работают из коробки, звёзды — только оформление. */
export function ReviewForm({ orderId }: { orderId: string }) {
  const dispatch = useAppDispatch();
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const parsed = parseWith(reviewSchema, { rating, text });
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await dispatch(submitReview({ orderId, input: parsed.data })).unwrap();
      dispatch(pushToast('success', 'Спасибо за отзыв!'));
    } catch (error) {
      dispatch(pushToast('error', errorMessage(error, 'Не удалось отправить отзыв')));
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
      <fieldset className={styles.rating}>
        <legend>Оценка работы</legend>
        <div className={styles.stars}>
          {RATING_HINTS.map((hint, index) => {
            const value = index + 1;
            return (
              <label
                key={value}
                className={cx(styles.star, rating !== null && value <= rating && styles.on)}
                title={hint}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  className={styles.input}
                  checked={rating === value}
                  onChange={() => {
                    setRating(value);
                    setErrors((prev) => ({ ...prev, rating: '' }));
                  }}
                />
                <span aria-hidden="true">★</span>
                <span className="visually-hidden">
                  {value} — {hint}
                </span>
              </label>
            );
          })}
        </div>
        {errors.rating && (
          <p className={styles.error} role="alert">
            {errors.rating}
          </p>
        )}
      </fieldset>
      <Textarea
        label="Отзыв"
        name="text"
        value={text}
        error={errors.text}
        hint={`${text.length}/500 · необязательно: что получилось и что можно улучшить`}
        onChange={(event) => setText(event.target.value)}
      />
      <Button type="submit" loading={submitting}>
        Оставить отзыв
      </Button>
    </form>
  );
}
