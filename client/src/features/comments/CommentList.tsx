import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { cx } from '../../lib/cx';
import { errorMessage } from '../../lib/errors';
import { formatTime } from '../../lib/format';
import type { Comment, Role } from '../../types/domain';
import { pushToast } from '../toasts/toastsSlice';
import {
  fetchComments,
  removeComment,
  selectAllComments,
  selectCommentsError,
  selectCommentsStatus,
  selectFilteredComments,
  updateComment,
  type CommentFilter,
} from './commentsSlice';
import styles from './CommentList.module.css';

interface CommentListProps {
  versionId: string;
  userId: string;
  role: Role;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

const FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'resolved', label: 'Решённые' },
] as const;

export function CommentList({ versionId, userId, role, currentTime, onSeek }: CommentListProps) {
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<CommentFilter>('all');
  const [toDelete, setToDelete] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const status = useAppSelector(selectCommentsStatus);
  const error = useAppSelector(selectCommentsError);
  const all = useAppSelector(selectAllComments);
  const visible = useAppSelector((state) => selectFilteredComments(state, filter));

  const activeId = [...all].reverse().find((c) => c.timeSec <= currentTime + 0.5)?.id;

  const toggleResolved = (comment: Comment) => {
    void dispatch(updateComment({ id: comment.id, patch: { resolved: !comment.resolved } }))
      .unwrap()
      .catch((failure: unknown) =>
        dispatch(pushToast('error', errorMessage(failure, 'Не удалось обновить правку'))),
      );
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await dispatch(removeComment(toDelete.id)).unwrap();
      dispatch(pushToast('success', 'Правка удалена'));
    } catch (failure) {
      dispatch(pushToast('error', errorMessage(failure, 'Не удалось удалить правку')));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  if (status === 'failed' && error) {
    return (
      <ErrorState
        title="Не удалось загрузить правки"
        message={error.message}
        onRetry={() => void dispatch(fetchComments(versionId))}
      />
    );
  }

  if (status === 'loading' && all.length === 0) {
    return (
      <div
        className={styles.skeletons}
        aria-busy="true"
        role="status"
        aria-label="Загружаем правки"
      >
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </div>
    );
  }

  if (all.length === 0) {
    return (
      <EmptyState
        title="Правок пока нет"
        description="Поставьте воспроизведение на нужное место и опишите, что поправить, — правка привяжется к таймкоду."
      />
    );
  }

  const openCount = all.filter((c) => !c.resolved).length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <SegmentedControl
          label="Фильтр правок"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
        <p className={styles.counter} role="status">
          Открыто: {openCount} из {all.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className={styles.noMatch}>В этом фильтре правок нет.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((comment) => {
            const mine = comment.authorId === userId;
            const canResolve = mine || role === 'owner';
            const canDelete = mine || role === 'owner';
            return (
              <li
                key={comment.id}
                className={cx(
                  styles.item,
                  comment.resolved && styles.resolved,
                  comment.id === activeId && styles.active,
                )}
                aria-current={comment.id === activeId ? 'true' : undefined}
              >
                <button
                  type="button"
                  className={styles.time}
                  onClick={() => onSeek(comment.timeSec)}
                  aria-label={`Перейти к ${formatTime(comment.timeSec)}`}
                >
                  {formatTime(comment.timeSec)}
                </button>
                <div className={styles.body}>
                  <p className={styles.text}>{comment.text}</p>
                  <p className={styles.meta}>
                    {comment.authorName}
                    {mine && ' (вы)'}
                    {comment.resolved && ' · решено'}
                  </p>
                </div>
                <div className={styles.actions}>
                  {canResolve && (
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-pressed={comment.resolved}
                      onClick={() => toggleResolved(comment)}
                    >
                      {comment.resolved ? 'Вернуть' : 'Решено'}
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToDelete(comment)}
                      aria-label={`Удалить правку на ${formatTime(comment.timeSec)}`}
                    >
                      Удалить
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить правку?"
        description={
          toDelete ? `«${toDelete.text}» будет удалена без возможности восстановления.` : ''
        }
        confirmLabel="Удалить"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
