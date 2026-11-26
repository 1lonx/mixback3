import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { createAppApi } from './api';
import { ApiProvider } from './app/ApiProvider';
import { createAppRouter } from './app/router';
import { createStore } from './app/store';
import { applyTheme, readPreference } from './lib/theme';
import './styles/global.css';

applyTheme(readPreference());

const appApi = createAppApi();
const store = createStore(appApi.api);
const router = createAppRouter();

const container = document.getElementById('root');
if (!container) throw new Error('Не найден контейнер #root');

createRoot(container).render(
  <StrictMode>
    <ApiProvider value={appApi}>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </ApiProvider>
  </StrictMode>,
);
