import { Link } from 'react-router';
import { useAppSelector } from '../app/hooks';
import { buttonClassName } from '../components/ui/buttonClassName';
import { Card } from '../components/ui/Card';
import { selectUser } from '../features/auth/authSlice';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './HomePage.module.css';

const FEATURES = [
  {
    title: 'Каталог звукорежиссёров',
    text: 'Профили с услугами, ценами и сроками. Можно послушать портфолио и прочитать отзывы, прежде чем писать.',
  },
  {
    title: 'Заказ в пару кликов',
    text: 'Опишите задачу, звукорежиссёр примет заказ — и автоматически откроется проект с чатом.',
  },
  {
    title: 'Правки на волне',
    text: 'Комментарии привязаны к секундам трека. Версии миксов можно сравнить на слух с выровненной громкостью.',
  },
  {
    title: 'Чек-лист из правок',
    text: 'Замечания собираются в список задач: звукорежиссёр видит, что исправить, и отмечает сделанное.',
  },
] as const;

const STEPS = [
  ['Выберите', 'Найдите звукорежиссёра по жанру, услуге и бюджету.'],
  ['Закажите', 'Расскажите, что нужно сделать, и обсудите детали в чате.'],
  ['Получите версию', 'Звукорежиссёр загружает микс, вы слушаете его прямо на сайте.'],
  ['Оставьте правки', 'Отметьте на волне, что поправить, и примите готовую работу.'],
] as const;

/** Главная: что такое Mixback и с чего начать. Открыта всем, в том числе гостям. */
export function HomePage() {
  useDocumentTitle('Mixback — звукорежиссёры и правки на волне');
  const user = useAppSelector(selectUser);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1>Сведение и мастеринг с правками прямо на волне</h1>
        <p className={styles.lead}>
          <strong>Mixback</strong> — биржа звукорежиссёров. Выбирайте исполнителя, слушайте его
          работы, заказывайте сведение или мастеринг и обсуждайте правки на нужных секундах трека, а
          не в бесконечной переписке.
        </p>
        <div className={styles.actions}>
          <Link to="/engineers" className={buttonClassName()}>
            Найти звукорежиссёра
          </Link>
          {user ? (
            <Link to="/projects" className={buttonClassName({ variant: 'secondary' })}>
              Мои проекты
            </Link>
          ) : (
            <Link to="/login" className={buttonClassName({ variant: 'secondary' })}>
              Войти или зарегистрироваться
            </Link>
          )}
        </div>
      </header>

      <section aria-labelledby="features-title" className={styles.section}>
        <h2 id="features-title">Что умеет Mixback</h2>
        <ul className={styles.features}>
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <Card className={styles.feature}>
                <h3>{feature.title}</h3>
                <p className={styles.muted}>{feature.text}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps-title" className={styles.section}>
        <h2 id="steps-title">Как это работает</h2>
        <ol className={styles.steps}>
          {STEPS.map(([title, text], index) => (
            <li key={title}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <strong>{title}</strong>
              <span className={styles.muted}>{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="audience-title" className={styles.section}>
        <h2 id="audience-title">Для кого</h2>
        <div className={styles.audience}>
          <Card className={styles.feature}>
            <h3>Артистам и авторам</h3>
            <p className={styles.muted}>
              Нужен звук лучше? Выберите звукорежиссёра, закажите услугу с понятной ценой и
              принимайте работу по версиям.
            </p>
          </Card>
          <Card className={styles.feature}>
            <h3>Звукорежиссёрам</h3>
            <p className={styles.muted}>
              Заполните анкету, добавьте работы в портфолио и получайте заказы вместе с чёткими
              правками на таймкодах.
            </p>
            <Link
              to={user ? '/profile/engineer' : '/login'}
              className={buttonClassName({ variant: 'secondary' })}
            >
              {user ? 'Моя анкета' : 'Стать звукорежиссёром'}
            </Link>
          </Card>
        </div>
      </section>

      <p className={styles.more}>
        Подробнее о проекте, демо-аккаунты и технологии — на странице{' '}
        <Link to="/about">«О проекте»</Link>.
      </p>
    </div>
  );
}
