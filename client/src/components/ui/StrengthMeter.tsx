import { cx } from '../../lib/cx';
import { passwordStrength } from '../../lib/passwordStrength';
import styles from './StrengthMeter.module.css';

/** Индикатор надёжности пароля: цвет + текст (цвет один не должен быть единственным признаком). */
export function StrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  if (!password) return null;
  return (
    <div className={styles.meter}>
      <div className={styles.bars} aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span key={level} className={cx(styles.bar, level <= score && styles[`level${score}`])} />
        ))}
      </div>
      <p className={styles.label} role="status">
        Надёжность пароля: {label.toLowerCase()}
      </p>
    </div>
  );
}
