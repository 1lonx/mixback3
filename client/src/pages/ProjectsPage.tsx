import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/buttonClassName';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { Card } from '../components/ui/Card';
import { ProjectCard } from '../features/projects/ProjectCard';
import { ProjectFilters } from '../features/projects/ProjectFilters';
import {
  fetchProjects,
  selectAllProjects,
  selectProjectsError,
  selectProjectsStatus,
} from '../features/projects/projectsSlice';
import {
  DEFAULT_QUERY,
  hasActiveFilters,
  parseProjectsQuery,
  toSearchParams,
} from '../features/projects/query';
import { useReveal } from '../lib/motion';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { ProjectsQuery } from '../types/domain';
import styles from './ProjectsPage.module.css';

function SkeletonList() {
  return (
    <ul className={styles.grid} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className={styles.skeletonCard}>
            <Skeleton height={22} width="40%" />
            <Skeleton height={26} width="75%" />
            <Skeleton height={18} width="55%" />
            <Skeleton height={16} width="65%" />
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function ProjectsPage() {
  useDocumentTitle('Проекты');
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const projects = useAppSelector(selectAllProjects);
  const status = useAppSelector(selectProjectsStatus);
  const error = useAppSelector(selectProjectsError);

  const query = useMemo(() => parseProjectsQuery(searchParams), [searchParams]);

  const updateQuery = useCallback(
    (patch: Partial<ProjectsQuery>) => {
      setSearchParams((prev) => toSearchParams({ ...parseProjectsQuery(prev), ...patch }), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const { q, status: statusFilter, sort } = query;
  const load = useCallback(() => {
    void dispatch(fetchProjects({ q, status: statusFilter, sort }));
  }, [dispatch, q, statusFilter, sort]);

  useEffect(load, [load]);

  const resetFilters = () => {
    setSearchParams(toSearchParams(DEFAULT_QUERY), { replace: true });
  };

  const filtered = hasActiveFilters(query);
  const gridRef = useRef<HTMLDivElement>(null);
  useReveal(gridRef, 'li', [status === 'succeeded']);
  const showSkeleton = status === 'loading' && projects.length === 0;

  let content;
  if (status === 'failed' && error) {
    content = <ErrorState message={error.message} onRetry={load} />;
  } else if (showSkeleton || status === 'idle') {
    content = <SkeletonList />;
  } else if (projects.length === 0) {
    content = filtered ? (
      <EmptyState
        title="Ничего не найдено"
        description="Попробуйте изменить запрос или сбросить фильтры."
        action={
          <Button variant="secondary" onClick={resetFilters}>
            Сбросить фильтры
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="Пока нет ни одного проекта"
        description="Создайте проект, загрузите первый микс и отправьте ссылку артисту — он оставит правки прямо на волне."
        action={
          <Link to="/projects/new" className={buttonClassName()}>
            Создать проект
          </Link>
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
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>Проекты</h1>
        <Link to="/projects/new" className={buttonClassName()}>
          Новый проект
        </Link>
      </div>

      <ProjectFilters query={query} onChange={updateQuery} />

      <p className="visually-hidden" role="status">
        {status === 'loading' || status === 'idle'
          ? 'Загружаем проекты…'
          : status === 'failed'
            ? 'Не удалось загрузить проекты'
            : `Найдено проектов: ${projects.length}`}
      </p>

      <div ref={gridRef}>{content}</div>
    </div>
  );
}
