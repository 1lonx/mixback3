import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { errorMessage } from '../../lib/errors';
import { pushToast } from '../toasts/toastsSlice';
import { ChatView } from './ChatView';
import {
  fetchMessages,
  selectMessages,
  selectMessagesError,
  selectMessagesStatus,
  sendMessage,
} from './messagesSlice';

/** Как часто подтягиваем новые сообщения собеседника (в мок-API это обычный запрос, у сервера — WebSocket). */
export const CHAT_POLL_MS = 5000;

interface ChatPanelProps {
  orderId: string;
  currentUserId: string;
  readOnly: boolean;
}

export function ChatPanel({ orderId, currentUserId, readOnly }: ChatPanelProps) {
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectMessages);
  const status = useAppSelector(selectMessagesStatus);
  const error = useAppSelector(selectMessagesError);

  const load = useCallback(() => void dispatch(fetchMessages(orderId)), [dispatch, orderId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, CHAT_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const send = async (text: string) => {
    try {
      await dispatch(sendMessage({ orderId, input: { text } })).unwrap();
    } catch (failure) {
      dispatch(pushToast('error', errorMessage(failure, 'Не удалось отправить сообщение')));
      throw failure;
    }
  };

  return (
    <ChatView
      messages={messages}
      currentUserId={currentUserId}
      loading={status === 'loading' || status === 'idle'}
      loadError={status === 'failed' ? (error?.message ?? 'Не удалось загрузить переписку') : null}
      readOnly={readOnly}
      onSend={send}
      onRetry={load}
    />
  );
}
