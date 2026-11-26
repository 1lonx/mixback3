import { hueOf, initialsOf } from '../../lib/avatar';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  size?: number;
}

/** Декоративный аватар: имя рядом уже есть текстом, поэтому для скринридера он скрыт. */
export function Avatar({ name, size = 36 }: AvatarProps) {
  const hue = hueOf(name);
  return (
    <span
      className={styles.avatar}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 55% 34%), hsl(${(hue + 40) % 360} 60% 28%))`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
