import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/buttonClassName';
import { Card } from '../components/ui/Card';
import { ErrorState, Skeleton } from '../components/ui/States';
import { Stars } from '../components/ui/Stars';
import { selectUser } from '../features/auth/authSlice';
import {
  fetchEngineer,
  selectEngineerDetail,
  selectEngineerError,
  selectEngineerStatus,
} from '../features/engineers/engineerSlice';
import { OrderDialog } from '../features/engineers/OrderDialog';
import { PortfolioPlayer } from '../features/engineers/PortfolioPlayer';
import { formatDate, pluralize } from '../lib/format';
import { formatPrice, SERVICE_LABELS } from '../lib/labels';
import { useReveal } from '../lib/motion';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './EngineerPage.module.css';

export function EngineerPage() {
  const { engineerId = '' } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector(selectUser);
  const detail = useAppSelector(selectEngineerDetail);
  const status = useAppSelector(selectEngineerStatus);
  const error = useAppSelector(selectEngineerError);
  const rootRef = useRef<HTMLDivElement>(null);

  /** Новый ключ при каждом открытии: форма заказа начинает с чистого листа. */
  const dialogCount = useRef(0);
  const [dialog, setDialog] = useState<{ key: number; serviceId: string | null } | null>(null);

  useDocumentTitle(detail?.userId === engineerId ? detail.name : 'Звукорежиссёр');

  const load = () => void dispatch(fetchEngineer(engineerId));
  useEffect(() => {
    void dispatch(fetchEngineer(engineerId));
  }, [dispatch, engineerId]);

  const loaded = detail?.userId === engineerId ? detail : null;
  useReveal(rootRef, '[data-reveal]', [Boolean(loaded)]);

  if (status === 'failed' && error && !loaded) {
    return (
      <ErrorState
        title={error.status === 404 ? 'Звукорежиссёр не найден' : 'Не удалось загрузить профиль'}
        message={error.status === 404 ? 'Возможно, анкета скрыта или удалена.' : error.message}
        onRetry={error.status === 404 ? undefined : load}
      />
    );
  }

  if (!loaded) {
    return (
      <div className={styles.page} aria-busy="true" role="status" aria-label="Загружаем профиль">
        <Skeleton height={120} />
        <Skeleton height={200} />
        <Skeleton height={160} />
      </div>
    );
  }

  const order = (serviceId: string | null) => {
    if (!user) {
      // После входа вернёмся на эту же страницу.
      void navigate('/login', {
        state: { from: { pathname: location.pathname, search: location.search } },
      });
      return;
    }
    dialogCount.current += 1;
    setDialog({ key: dialogCount.current, serviceId });
  };

  return (
    <div className={styles.page} ref={rootRef}>
      <header className={styles.hero} data-reveal>
        <Avatar name={loaded.name} size={80} />
        <div className={styles.heroText}>
          <h1>{loaded.name}</h1>
          <p className={styles.headline}>{loaded.headline}</p>
          <div className={styles.meta}>
            <Stars value={loaded.rating} count={loaded.reviewsCount} />
            <span className={styles.muted}>
              {pluralize(loaded.completedOrders, [
                'выполненный заказ',
                'выполненных заказа',
                'выполненных заказов',
              ])}
            </span>
          </div>
          <ul className={styles.genres} aria-label="Жанры">
            {loaded.genres.map((genre) => (
              <li key={genre}>
                <Badge>{genre}</Badge>
              </li>
            ))}
          </ul>
        </div>
        {loaded.isMe && (
          <Link to="/profile/engineer" className={buttonClassName({ variant: 'secondary' })}>
            Редактировать анкету
          </Link>
        )}
      </header>

      {loaded.coverUrl && (
        <img
          className={styles.cover}
          src={loaded.coverUrl}
          alt={`Обложка анкеты: ${loaded.name}`}
          data-reveal
        />
      )}

      {loaded.isMe && !loaded.published && (
        <p className={styles.notice} role="status" data-reveal>
          Анкета скрыта: её видите только вы. Опубликуйте её в настройках, чтобы появиться в
          каталоге.
        </p>
      )}

      {loaded.bio && (
        <Card className={styles.section} aria-labelledby="about-title" data-reveal>
          <h2 id="about-title">О себе</h2>
          <p className={styles.bio}>{loaded.bio}</p>
        </Card>
      )}

      <Card className={styles.section} aria-labelledby="services-title" data-reveal>
        <h2 id="services-title">Услуги</h2>
        {loaded.services.length === 0 ? (
          <p className={styles.muted}>Услуги пока не добавлены.</p>
        ) : (
          <ul className={styles.services}>
            {loaded.services.map((service) => (
              <li key={service.id} className={styles.service}>
                <div className={styles.serviceText}>
                  <h3>{service.title}</h3>
                  <p className={styles.muted}>
                    {SERVICE_LABELS[service.kind]} · срок{' '}
                    {pluralize(service.days, ['день', 'дня', 'дней'])}
                  </p>
                  {service.description && <p>{service.description}</p>}
                </div>
                <div className={styles.serviceBuy}>
                  <strong className={styles.price}>{formatPrice(service.priceRub)}</strong>
                  {!loaded.isMe && (
                    <Button
                      onClick={() => order(service.id)}
                      aria-label={`Заказать: ${service.title}`}
                    >
                      Заказать
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className={styles.section} aria-labelledby="portfolio-title" data-reveal>
        <h2 id="portfolio-title">Портфолио</h2>
        {loaded.portfolio.length === 0 ? (
          <p className={styles.muted}>Работы пока не добавлены.</p>
        ) : (
          <PortfolioPlayer tracks={loaded.portfolio} />
        )}
      </Card>

      <Card className={styles.section} aria-labelledby="reviews-title" data-reveal>
        <h2 id="reviews-title">Отзывы</h2>
        {loaded.reviews.length === 0 ? (
          <p className={styles.muted}>
            Отзывов пока нет. Они появляются после завершённых заказов.
          </p>
        ) : (
          <ul className={styles.reviews}>
            {loaded.reviews.map((review) => (
              <li key={review.id} className={styles.review}>
                <div className={styles.reviewHead}>
                  <strong>{review.authorName}</strong>
                  <Stars value={review.rating} />
                  <time className={styles.muted} dateTime={review.createdAt}>
                    {formatDate(review.createdAt)}
                  </time>
                </div>
                {review.text && <p>{review.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {dialog && (
        <OrderDialog
          key={dialog.key}
          engineer={loaded}
          open
          initialServiceId={dialog.serviceId}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
