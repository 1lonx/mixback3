import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from '../components/ui/States';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Неизвестная ошибка';

  return (
    <main style={{ maxWidth: 560, margin: '64px auto', padding: '0 16px' }}>
      <ErrorState
        title="Что-то сломалось"
        message={message}
        onRetry={() => {
          window.location.reload();
        }}
      />
    </main>
  );
}
