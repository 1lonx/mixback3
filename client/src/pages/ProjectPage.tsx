import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/buttonClassName';
import { StatusBadge, RoleBadge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/Dialog';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { selectUser } from '../features/auth/authSlice';
import { VersionWorkspace } from '../features/player/VersionWorkspace';
import { MembersPanel } from '../features/project/MembersPanel';
import { UploadVersion } from '../features/project/UploadVersion';
import {
  deleteProject,
  fetchProject,
  selectProjectDetail,
  selectProjectError,
  selectProjectStatus,
} from '../features/project/projectSlice';
import { pushToast } from '../features/toasts/toastsSlice';
import { errorMessage } from '../lib/errors';
import { formatDate } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './ProjectPage.module.css';

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const user = useAppSelector(selectUser);
  const detail = useAppSelector(selectProjectDetail);
  const status = useAppSelector(selectProjectStatus);
  const error = useAppSelector(selectProjectError);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => void dispatch(fetchProject(projectId));
  useEffect(() => {
    void dispatch(fetchProject(projectId));
  }, [dispatch, projectId]);

  const current = detail?.project.id === projectId ? detail : null;
  useDocumentTitle(current?.project.title ?? 'Проект');

  if (status === 'failed' && error && !current) {
    const missing = error.status === 404;
    return (
      <ErrorState
        title={missing ? 'Проект не найден' : 'Не удалось загрузить проект'}
        message={missing ? 'Возможно, его удалили или у вас нет к нему доступа.' : error.message}
        onRetry={missing ? undefined : load}
      />
    );
  }

  if (!current || !user) {
    return (
      <div className={styles.page} aria-busy="true" role="status" aria-label="Загружаем проект">
        <Skeleton height={36} width="45%" />
        <Skeleton height={20} width="25%" />
        <Skeleton height={260} />
      </div>
    );
  }

  const { project, role, members, versions } = current;
  const isOwner = role === 'owner';

  // Версия выбирается через адрес (?v=2): такой экран можно отправить ссылкой.
  const latest = versions[versions.length - 1];
  const requested = Number(searchParams.get('v'));
  const version = versions.find((v) => v.number === requested) ?? latest;

  const selectVersion = (number: number) =>
    setSearchParams({ v: String(number) }, { replace: true });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteProject(project.id)).unwrap();
      dispatch(pushToast('success', `Проект «${project.title}» удалён`));
      void navigate('/projects', { replace: true });
    } catch (failure) {
      dispatch(pushToast('error', errorMessage(failure, 'Не удалось удалить проект')));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const aside = (
    <>
      <MembersPanel projectId={project.id} members={members} role={role} />
      {isOwner && (
        <UploadVersion projectId={project.id} onUploaded={(v) => selectVersion(v.number)} />
      )}
    </>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.badges}>
            <StatusBadge status={project.status} />
            <RoleBadge value={role} />
          </div>
          <h1>{project.title}</h1>
          <p className={styles.meta}>
            {project.artist} · обновлён {formatDate(project.updatedAt)}
          </p>
          {project.description && <p className={styles.description}>{project.description}</p>}
        </div>
        {isOwner && (
          <div className={styles.actions}>
            <Link
              to={`/projects/${project.id}/edit`}
              className={buttonClassName({ variant: 'secondary' })}
            >
              Редактировать
            </Link>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Удалить
            </Button>
          </div>
        )}
      </header>

      {version ? (
        <>
          <div className={styles.versions}>
            <SegmentedControl
              label="Версия микса"
              options={versions.map((v) => ({ value: String(v.number), label: `v${v.number}` }))}
              value={String(version.number)}
              onChange={(value) => selectVersion(Number(value))}
            />
            <p className={styles.versionNote}>
              {version.note} · {formatDate(version.createdAt)}
            </p>
          </div>
          {/* Без key: плеер живёт между версиями, чтобы A/B продолжал играть с того же места. */}
          <VersionWorkspace
            version={version}
            versions={versions}
            role={role}
            userId={user.id}
            aside={aside}
          />
        </>
      ) : (
        <div className={styles.empty}>
          <EmptyState
            title="Версий пока нет"
            description={
              isOwner
                ? 'Загрузите первый микс — после этого можно отправлять ссылку артисту.'
                : 'Звукорежиссёр ещё не загрузил ни одной версии. Загляните позже.'
            }
          />
          {isOwner && (
            <UploadVersion projectId={project.id} onUploaded={(v) => selectVersion(v.number)} />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить проект?"
        description={`«${project.title}» будет удалён вместе со всеми версиями и правками. Это действие нельзя отменить.`}
        confirmLabel="Удалить проект"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
