import { Link } from 'react-router';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Stars } from '../../components/ui/Stars';
import { pluralize } from '../../lib/format';
import { formatPrice } from '../../lib/labels';
import type { EngineerSummary } from '../../types/domain';
import styles from './EngineerCard.module.css';

export function EngineerCard({ engineer }: { engineer: EngineerSummary }) {
  return (
    <Card interactive className={styles.card}>
      {engineer.coverUrl && (
        <img className={styles.cover} src={engineer.coverUrl} alt="" loading="lazy" />
      )}
      <div className={styles.head}>
        <Avatar name={engineer.name} size={48} />
        <div className={styles.who}>
          <h3 className={styles.name}>
            {/* Растянутая ссылка: кликабельна вся карточка, но для скринридера это одна ссылка с именем. */}
            <Link to={`/engineers/${engineer.userId}`} className={styles.link}>
              {engineer.name}
            </Link>
          </h3>
          <Stars value={engineer.rating} count={engineer.reviewsCount} />
        </div>
      </div>

      <p className={styles.headline}>{engineer.headline}</p>

      <ul className={styles.genres} aria-label="Жанры">
        {engineer.genres.map((genre) => (
          <li key={genre}>
            <Badge>{genre}</Badge>
          </li>
        ))}
      </ul>

      <div className={styles.foot}>
        <span className={styles.price}>
          {engineer.minPrice === null ? 'Цена не указана' : `от ${formatPrice(engineer.minPrice)}`}
        </span>
        <span className={styles.orders}>
          {pluralize(engineer.completedOrders, ['заказ', 'заказа', 'заказов'])}
        </span>
      </div>
    </Card>
  );
}
