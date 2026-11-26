import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { restoreSession, selectAuthInitialized, selectSessionError, selectUser } from './authSlice';

/** Пускает дальше только авторизованных; остальных отправляет на /login и запоминает, куда они шли. */
export function RequireAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const initialized = useAppSelector(selectAuthInitialized);
  const sessionError = useAppSelector(selectSessionError);
  const location = useLocation();

  // Пока не проверили сохранённую сессию, решать про редирект рано — иначе будет «мигание» формы входа.
  if (!initialized) return <LoadingState label="Проверяем вход…" />;

  // Нет связи — это не «вы вышли». Не выкидываем на форму входа, а предлагаем повторить.
  if (!user && sessionError) {
    return (
      <ErrorState
        title="Не удалось проверить вход"
        message={sessionError.message}
        onRetry={() => void dispatch(restoreSession())}
      />
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
