import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import { formatDate, pluralize } from '../../lib/format';
import type { ProjectSummary } from '../../types/domain';
import styles from './ProjectCard.module.css';

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Card interactive className={styles.card}>
      <div className={styles.badges}>
        <StatusBadge status={project.status} />
        {project.role === 'artist' && <RoleBadge value={project.role} />}
      </div>
      <h3 className={styles.title}>
        {/* Растянутая ссылка: кликабельна вся карточка, но для скринридера это одна ссылка с названием. */}
        <Link to={`/projects/${project.id}`} className={styles.link}>
          {project.title}
        </Link>
      </h3>
      <p className={styles.artist}>{project.artist}</p>
      <dl className={styles.stats}>
        <div>
          <dt className="visually-hidden">Версии</dt>
          <dd>{pluralize(project.versionsCount, ['версия', 'версии', 'версий'])}</dd>
        </div>
        <div>
          <dt className="visually-hidden">Открытые правки</dt>
          <dd className={project.openComments > 0 ? styles.open : undefined}>
            {pluralize(project.openComments, ['правка', 'правки', 'правок'])}
          </dd>
        </div>
      </dl>
      <p className={styles.date}>Обновлён {formatDate(project.updatedAt)}</p>
    </Card>
  );
}
