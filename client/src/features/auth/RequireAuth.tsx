import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { restoreSession, selectAuthInitialized, selectSessionError, selectUser } from './authSlice';

export function RequireAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const initialized = useAppSelector(selectAuthInitialized);
  const sessionError = useAppSelector(selectSessionError);
  const location = useLocation();

  if (!initialized) return <LoadingState label="Проверяем вход…" />;

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
