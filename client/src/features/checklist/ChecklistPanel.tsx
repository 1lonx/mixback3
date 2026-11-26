import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState, Skeleton } from '../../components/ui/States';
import { CATEGORY_LABELS } from '../../lib/checklist';
import { formatTime } from '../../lib/format';
import type { ChecklistCategory, ChecklistItem } from '../../types/domain';
import {
  fetchChecklist,
  generateChecklist,
  selectChecklistEntry,
  selectChecklistProgress,
  toggleChecklistItem,
} from './checklistSlice';
import styles from './ChecklistPanel.module.css';

interface ChecklistPanelProps {
  versionId: string;
  onSeek: (seconds: number) => void;
}

function groupByCategory(items: readonly ChecklistItem[]) {
  const groups = new Map<ChecklistCategory, ChecklistItem[]>();
  for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  return [...groups];
}

/** AI-чек-лист правок. Сейчас генерация локальная (имитация LLM), на этапе 4 — вызов LLM API. */
export function ChecklistPanel({ versionId, onSeek }: ChecklistPanelProps) {
  const dispatch = useAppDispatch();
  const entry = useAppSelector((state) => selectChecklistEntry(state, versionId));
  const progress = useAppSelector((state) => selectChecklistProgress(state, versionId));

  useEffect(() => {
    void dispatch(fetchChecklist(versionId));
  }, [dispatch, versionId]);

  const generate = () => void dispatch(generateChecklist(versionId));
  const items = entry.data?.items ?? [];
  const loading = entry.status === 'loading';

  return (
    <Card aria-labelledby="checklist-title" className={styles.panel}>
      <div className={styles.head}>
        <h2 id="checklist-title">AI-чек-лист</h2>
        <Button size="sm" onClick={generate} loading={loading}>
          {entry.data ? 'Пересобрать' : 'Собрать из правок'}
        </Button>
      </div>

      {loading && !entry.data && (
        <div role="status" aria-label="Анализируем правки" className={styles.loading}>
          <p className={styles.hint}>Анализируем правки и группируем по задачам…</p>
          <Skeleton height={20} />
          <Skeleton height={20} width="80%" />
          <Skeleton height={20} width="65%" />
        </div>
      )}

      {entry.status === 'failed' && entry.error && (
        <ErrorState
          title="Не удалось собрать чек-лист"
          message={entry.error.message}
          onRetry={generate}
        />
      )}

      {!loading && !entry.error && !entry.data && (
        <p className={styles.hint}>
          Mixback превратит открытые правки в короткий список задач по категориям: низ, вокал,
          верха, динамика.
        </p>
      )}

      {entry.data && items.length === 0 && (
        <p className={styles.hint}>Открытых правок нет — чек-лист пуст. Отличная работа!</p>
      )}

      {items.length > 0 && (
        <>
          <p className={styles.progress} role="status">
            Выполнено {progress.done} из {progress.total}
          </p>
          {groupByCategory(items).map(([category, group]) => (
            <section key={category} aria-label={CATEGORY_LABELS[category]} className={styles.group}>
              <h3>{CATEGORY_LABELS[category]}</h3>
              <ul className={styles.items}>
                {group.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(event) =>
                          void dispatch(
                            toggleChecklistItem({
                              versionId,
                              itemId: item.id,
                              done: event.target.checked,
                            }),
                          )
                        }
                      />
                      <span className={item.done ? styles.done : undefined}>{item.text}</span>
                    </label>
                    <button
                      type="button"
                      className={styles.time}
                      onClick={() => onSeek(item.timeSec)}
                      aria-label={`Перейти к ${formatTime(item.timeSec)}`}
                    >
                      {formatTime(item.timeSec)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </Card>
  );
}
