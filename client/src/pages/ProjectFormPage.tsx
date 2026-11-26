import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Card } from '../components/ui/Card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { ProjectForm } from '../features/project/ProjectForm';
import {
  createProject,
  fetchProject,
  selectProjectDetail,
  selectProjectError,
  selectProjectStatus,
  updateProject,
} from '../features/project/projectSlice';
import { pushToast } from '../features/toasts/toastsSlice';
import { isSerializedError, serializeError, type SerializedError } from '../lib/errors';
import type { ProjectInput } from '../lib/schemas';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import styles from './ProjectFormPage.module.css';

/** Одна страница для создания (/projects/new) и редактирования (/projects/:id/edit). */
export function ProjectFormPage() {
  const { projectId } = useParams();
  const editing = projectId !== undefined;
  useDocumentTitle(editing ? 'Редактирование проекта' : 'Новый проект');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const detail = useAppSelector(selectProjectDetail);
  const status = useAppSelector(selectProjectStatus);
  const loadError = useAppSelector(selectProjectError);
  const [submitError, setSubmitError] = useState<SerializedError | null>(null);

  useEffect(() => {
    if (projectId) void dispatch(fetchProject(projectId));
  }, [dispatch, projectId]);

  const handleSubmit = async (values: ProjectInput) => {
    setSubmitError(null);
    try {
      if (projectId) {
        await dispatch(updateProject({ id: projectId, patch: values })).unwrap();
        dispatch(pushToast('success', 'Изменения сохранены'));
        void navigate(`/projects/${projectId}`);
      } else {
        const project = await dispatch(createProject(values)).unwrap();
        dispatch(pushToast('success', `Проект «${project.title}» создан`));
        void navigate(`/projects/${project.id}`);
      }
    } catch (error) {
      setSubmitError(isSerializedError(error) ? error : serializeError(error));
    }
  };

  const goBack = () => void navigate(projectId ? `/projects/${projectId}` : '/projects');

  let body;
  if (editing && status === 'failed' && loadError) {
    body = (
      <ErrorState
        message={loadError.message}
        onRetry={() => void dispatch(fetchProject(projectId))}
      />
    );
  } else if (editing && detail?.project.id !== projectId) {
    body = <LoadingState label="Загружаем проект…" />;
  } else if (editing && detail?.role !== 'owner') {
    body = (
      <ErrorState title="Нет доступа" message="Редактировать проект может только его владелец." />
    );
  } else {
    const project = detail?.project;
    body = (
      <ProjectForm
        initial={
          project && {
            title: project.title,
            artist: project.artist,
            description: project.description,
            status: project.status,
          }
        }
        showStatus={editing}
        submitLabel={editing ? 'Сохранить' : 'Создать проект'}
        onSubmit={handleSubmit}
        onCancel={goBack}
        serverErrors={submitError?.fieldErrors}
        formError={submitError && !submitError.fieldErrors ? submitError.message : undefined}
      />
    );
  }

  return (
    <div className={styles.page}>
      <h1>{editing ? 'Редактирование проекта' : 'Новый проект'}</h1>
      <Card>{body}</Card>
    </div>
  );
}
