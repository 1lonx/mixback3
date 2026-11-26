import { Link } from 'react-router';
import { buttonClassName } from '../components/ui/buttonClassName';
import { EmptyState } from '../components/ui/States';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Страница не найдена');
  return (
    <EmptyState
      title="Страница не найдена"
      description="Возможно, ссылка устарела или в адресе опечатка."
      action={
        <Link to="/projects" className={buttonClassName()}>
          К проектам
        </Link>
      }
    />
  );
}
