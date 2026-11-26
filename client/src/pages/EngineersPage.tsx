import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/buttonClassName';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { selectUser } from '../features/auth/authSlice';
import {
  fetchEngineers,
  fetchPublishedCount,
  selectAllEngineers,
  selectCatalogError,
  selectCatalogStatus,
  selectPublishedCount,
} from '../features/engineers/catalogSlice';
import { EngineerCard } from '../features/engineers/EngineerCard';
import { EngineerFilters } from '../features/engineers/EngineerFilters';
import {
  DEFAULT_ENGINEERS_QUERY,
  hasActiveEngineerFilters,
  parseEngineersQuery,
  toEngineersParams,
} from '../features/engineers/query';
import { pluralize } from '../lib/format';
import { useReveal } from '../lib/motion';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { EngineersQuery } from '../types/domain';
import styles from './EngineersPage.module.css';

function SkeletonGrid() {
  return (
    <ul className={styles.grid} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className={styles.skeletonCard}>
            <Skeleton height={48} width="70%" />
            <Skeleton height={18} />
            <Skeleton height={26} width="50%" />
            <Skeleton height={20} width="40%" />
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function EngineersPage() {
  useDocumentTitle('Звукорежиссёры');
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [searchParams, setSearchParams] = useSearchParams();

  const engineers = useAppSelector(selectAllEngineers);
  const status = useAppSelector(selectCatalogStatus);
  const publishedCount = useAppSelector(selectPublishedCount);
  const error = useAppSelector(selectCatalogError);

  const query = useMemo(() => parseEngineersQuery(searchParams), [searchParams]);

  const updateQuery = useCallback(
    (patch: Partial<EngineersQuery>) => {
      setSearchParams((prev) => toEngineersParams({ ...parseEngineersQuery(prev), ...patch }), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const { q, kind, genre, maxPrice, sort } = query;
  const load = useCallback(() => {
    void dispatch(fetchEngineers({ q, kind, genre, maxPrice, sort }));
  }, [dispatch, q, kind, genre, maxPrice, sort]);

  useEffect(load, [load]);
  useEffect(() => {
    void dispatch(fetchPublishedCount());
  }, [dispatch]);

  const filtered = hasActiveEngineerFilters(query);
  const gridRef = useRef<HTMLDivElement>(null);
  useReveal(gridRef, 'li', [status === 'succeeded']);
  const showSkeleton = status === 'loading' && engineers.length === 0;

  let content;
  if (status === 'failed' && error) {
    content = <ErrorState message={error.message} onRetry={load} />;
  } else if (showSkeleton || status === 'idle') {
    content = <SkeletonGrid />;
  } else if (engineers.length === 0) {
    content = filtered ? (
      <EmptyState
        title="Никого не нашли"
        description="Попробуйте убрать часть фильтров или изменить запрос."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              setSearchParams(toEngineersParams(DEFAULT_ENGINEERS_QUERY), { replace: true })
            }
          >
            Сбросить фильтры
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="В каталоге пока никого нет"
        description="Станьте первым: заполните анкету, добавьте работы и принимайте заказы."
        action={
          user ? (
            <Link to="/profile/engineer" className={buttonClassName()}>
              Заполнить анкету
            </Link>
          ) : undefined
        }
      />
    );
  } else {
    content = (
      <ul
        className={styles.grid}
        aria-busy={status === 'loading'}
        data-loading={status === 'loading'}
      >
        {engineers.map((engineer) => (
          <li key={engineer.userId}>
            <EngineerCard engineer={engineer} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.intro}>
          <h1>Найдите звукорежиссёра</h1>
          <p className={styles.lead}>
            Послушайте работы, выберите услугу с понятной ценой и сроком — и обсуждайте правки прямо
            на волне вашего трека.
          </p>
        </div>
        <Link
          to={user ? '/profile/engineer' : '/login'}
          className={buttonClassName({ variant: 'secondary' })}
        >
          {user ? 'Моя анкета звукорежиссёра' : 'Стать звукорежиссёром'}
        </Link>
      </header>

      {!user && (
        <ol className={styles.steps} aria-label="Как это работает">
          <li>
            <strong>1. Выберите</strong>
            <span>Послушайте работы и сравните цены, сроки и отзывы.</span>
          </li>
          <li>
            <strong>2. Закажите</strong>
            <span>Опишите задачу — звукорежиссёр примет заказ, и откроется проект.</span>
          </li>
          <li>
            <strong>3. Правьте на волне</strong>
            <span>Оставляйте комментарии на таймкодах и принимайте готовую работу.</span>
          </li>
        </ol>
      )}

      <EngineerFilters query={query} onChange={updateQuery} />

      {publishedCount !== null && (
        <p className={styles.stats}>
          Опубликовано анкет: <strong>{publishedCount}</strong>
          {filtered && status === 'succeeded' && (
            <>
              {' '}
              · подходит под фильтры: <strong>{engineers.length}</strong>
            </>
          )}
        </p>
      )}

      <p className="visually-hidden" role="status">
        {status === 'loading' || status === 'idle'
          ? 'Загружаем каталог…'
          : status === 'failed'
            ? 'Не удалось загрузить каталог'
            : `Найдено: ${pluralize(engineers.length, ['звукорежиссёр', 'звукорежиссёра', 'звукорежиссёров'])}`}
      </p>

      <div ref={gridRef}>{content}</div>
    </div>
  );
}
