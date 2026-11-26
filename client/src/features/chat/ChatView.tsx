import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Field';
import { cx } from '../../lib/cx';
import { formatDate } from '../../lib/format';
import { messageSchema, parseWith } from '../../lib/schemas';
import type { Message } from '../../types/domain';
import styles from './ChatView.module.css';

interface ChatViewProps {
  messages: readonly Message[];
  currentUserId: string;
  /** Идёт первая загрузка переписки. */
  loading?: boolean;
  /** Текст ошибки загрузки; показывается, пока нечего показать. */
  loadError?: string | null;
  /** Переписка закрыта: читать можно, писать нельзя. */
  readOnly?: boolean;
  /** Отправка; промис отклоняется, если сообщение не ушло, — тогда текст остаётся в поле. */
  onSend: (text: string) => Promise<void>;
  onRetry?: () => void;
}

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
};

/** Чат без знания о Redux и API — так его удобно проверять в Storybook и тестах. */
export function ChatView({
  messages,
  currentUserId,
  loading = false,
  loadError = null,
  readOnly = false,
  onSend,
  onRetry,
}: ChatViewProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Новое сообщение — прокручиваем к нему, как в любом мессенджере.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length]);

  const submit = async (event?: SyntheticEvent) => {
    event?.preventDefault();
    if (sending) return;
    const parsed = parseWith(messageSchema, { text });
    if (!parsed.success) {
      setError(parsed.errors.text);
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await onSend(parsed.data.text);
      setText('');
    } catch {
      // Ошибку показывает вызывающий код (тост); текст остаётся, чтобы его не набирать заново.
    } finally {
      setSending(false);
    }
  };

  // Enter отправляет, Shift+Enter — новая строка.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  let body;
  if (loading) {
    body = (
      <p className={styles.note} role="status">
        Загружаем переписку…
      </p>
    );
  } else if (loadError && messages.length === 0) {
    body = (
      <p className={styles.note} role="alert">
        {loadError}{' '}
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Повторить
          </Button>
        )}
      </p>
    );
  } else if (messages.length === 0) {
    body = (
      <p className={styles.note}>
        Сообщений пока нет. Задайте вопрос — например, про формат файлов.
      </p>
    );
  } else {
    body = (
      <div ref={logRef} className={styles.log} role="log" aria-label="Переписка" aria-live="polite">
        <ol className={styles.list}>
          {messages.map((message) => {
            const mine = message.authorId === currentUserId;
            return (
              <li key={message.id} className={cx(styles.item, mine && styles.mine)}>
                <div className={styles.bubble}>
                  {!mine && <strong className={styles.author}>{message.authorName}</strong>}
                  <p className={styles.text}>{message.text}</p>
                  <time className={styles.time} dateTime={message.createdAt}>
                    {formatDate(message.createdAt)}, {formatTime(message.createdAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className={styles.chat}>
      {body}
      {readOnly ? (
        <p className={styles.note}>Заказ закрыт — переписка доступна только для чтения.</p>
      ) : (
        <form className={styles.composer} noValidate onSubmit={(event) => void submit(event)}>
          <Textarea
            label="Сообщение"
            name="message"
            rows={2}
            value={text}
            error={error}
            maxLength={1000}
            hint="Enter — отправить, Shift+Enter — новая строка"
            onKeyDown={handleKeyDown}
            onChange={(event) => {
              setText(event.target.value);
              setError(undefined);
            }}
          />
          <Button type="submit" loading={sending}>
            Отправить
          </Button>
        </form>
      )}
    </div>
  );
}
