import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router';
import { RequireAuth } from '../features/auth/RequireAuth';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteError } from '../pages/RouteError';
import { AppLayout } from './AppLayout';

/** Страницы подгружаются лениво: wavesurfer и плеер не попадают в начальный бандл. */
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('../pages/HomePage')).HomePage }),
      },
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('../pages/LoginPage')).LoginPage }),
      },
      {
        path: 'engineers',
        lazy: async () => ({ Component: (await import('../pages/EngineersPage')).EngineersPage }),
      },
      {
        path: 'engineers/:engineerId',
        lazy: async () => ({ Component: (await import('../pages/EngineerPage')).EngineerPage }),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('../pages/AboutPage')).AboutPage }),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'projects',
            lazy: async () => ({ Component: (await import('../pages/ProjectsPage')).ProjectsPage }),
          },
          {
            path: 'orders',
            lazy: async () => ({ Component: (await import('../pages/OrdersPage')).OrdersPage }),
          },
          {
            path: 'orders/:orderId',
            lazy: async () => ({ Component: (await import('../pages/OrderPage')).OrderPage }),
          },
          {
            path: 'profile/engineer',
            lazy: async () => ({
              Component: (await import('../pages/EngineerEditPage')).EngineerEditPage,
            }),
          },
          {
            path: 'settings',
            lazy: async () => ({ Component: (await import('../pages/SettingsPage')).SettingsPage }),
          },
          {
            path: 'profile',
            lazy: async () => ({ Component: (await import('../pages/ProfilePage')).ProfilePage }),
          },
          {
            path: 'projects/new',
            lazy: async () => ({
              Component: (await import('../pages/ProjectFormPage')).ProjectFormPage,
            }),
          },
          {
            path: 'projects/:projectId',
            lazy: async () => ({ Component: (await import('../pages/ProjectPage')).ProjectPage }),
          },
          {
            path: 'projects/:projectId/edit',
            lazy: async () => ({
              Component: (await import('../pages/ProjectFormPage')).ProjectFormPage,
            }),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const createAppRouter = () =>
  createBrowserRouter(appRoutes, { basename: import.meta.env.BASE_URL });

/** Для тестов и Storybook: маршруты в памяти, без обращения к адресной строке. */
export const createTestRouter = (initialEntries: string[]) =>
  createMemoryRouter(appRoutes, { initialEntries });
