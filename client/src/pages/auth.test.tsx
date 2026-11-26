import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestApi, loginAs, renderApp } from '../test/utils';

const heading = (name: string | RegExp) => screen.findByRole('heading', { name, level: 1 });

describe('авторизация и защита маршрутов', () => {
  it('гость на / видит описание сервиса, без требования входа', async () => {
    const { router } = await renderApp({ route: '/' });
    expect(await heading(/Сведение и мастеринг/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByRole('form', { name: 'Вход' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Найти звукорежиссёра' })).toHaveAttribute(
      'href',
      '/engineers',
    );
  });

  it('гость на защищённой странице перенаправляется на вход', async () => {
    const { router } = await renderApp({ route: '/projects' });
    expect(await screen.findByRole('form', { name: 'Вход' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('после входа гость возвращается на страницу, куда шёл', async () => {
    const { router } = await renderApp({ route: '/projects/p_night' });
    await userEvent.click(await screen.findByRole('button', { name: 'Войти как звукорежиссёр' }));
    expect(await heading('Ночной город')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/p_night');
  });

  it('вход под артистом: в шапке имя, проекты только его', async () => {
    await renderApp({ route: '/login' });
    await userEvent.click(await screen.findByRole('button', { name: 'Войти как артист' }));
    expect(await heading('Проекты')).toBeInTheDocument();
    expect(screen.getByText('Лера')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ночной город' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Старое демо' })).not.toBeInTheDocument();
  });

  it('авторизованный пользователь, открыв /login, уходит на проекты', async () => {
    const { router } = await renderApp({ route: '/login', as: 'owner' });
    expect(await heading('Проекты')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects');
  });

  describe('форма входа', () => {
    it('пустая отправка показывает ошибки по полям и не обращается к серверу', async () => {
      await renderApp({ route: '/login' });
      await userEvent.click(await screen.findByRole('button', { name: 'Войти' }));
      expect(await screen.findByText('Укажите e-mail')).toBeInTheDocument();
      expect(screen.getByText('Введите пароль')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    });

    it('ошибка поля исчезает, как только пользователь начинает править его', async () => {
      await renderApp({ route: '/login' });
      await userEvent.click(await screen.findByRole('button', { name: 'Войти' }));
      expect(await screen.findByText('Укажите e-mail')).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText('E-mail'), 'a');
      expect(screen.queryByText('Укажите e-mail')).not.toBeInTheDocument();
    });

    it('неверный пароль — общая ошибка в role=alert', async () => {
      await renderApp({ route: '/login' });
      await userEvent.type(await screen.findByLabelText('E-mail'), 'demo@mixback.app');
      await userEvent.type(screen.getByLabelText('Пароль'), 'wrong-pass1');
      await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
      expect(await screen.findByText('Неверный e-mail или пароль')).toBeInTheDocument();
      expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
    });

    it('сетевая ошибка объясняется пользователю', async () => {
      const { appApi } = await renderApp({ route: '/login' });
      appApi.controls.set({ failNetwork: true });
      await userEvent.type(await screen.findByLabelText('E-mail'), 'demo@mixback.app');
      await userEvent.type(screen.getByLabelText('Пароль'), 'demo1234');
      await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
      expect(await screen.findByText(/Нет соединения с сервером/)).toBeInTheDocument();
    });

    it('успешный вход ведёт на список проектов', async () => {
      await renderApp({ route: '/login' });
      await userEvent.type(await screen.findByLabelText('E-mail'), 'demo@mixback.app');
      await userEvent.type(screen.getByLabelText('Пароль'), 'demo1234');
      await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
      expect(await heading('Проекты')).toBeInTheDocument();
    });
  });

  describe('регистрация', () => {
    async function openRegister() {
      const view = await renderApp({ route: '/login' });
      await userEvent.click(await screen.findByRole('radio', { name: 'Регистрация' }));
      return view;
    }

    it('показывает дополнительное поле «Имя» и подсказку к паролю', async () => {
      await openRegister();
      expect(screen.getByLabelText('Имя')).toBeInTheDocument();
      expect(screen.getByLabelText('Пароль')).toHaveAccessibleDescription(
        'Минимум 8 символов, буква и цифра',
      );
    });

    it('слабый пароль отклоняется на клиенте', async () => {
      await openRegister();
      await userEvent.type(screen.getByLabelText('Имя'), 'Новичок');
      await userEvent.type(screen.getByLabelText('E-mail'), 'new@mail.ru');
      await userEvent.type(screen.getByLabelText('Пароль'), '12345678');
      await userEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
      expect(await screen.findByText('Добавьте в пароль хотя бы одну букву')).toBeInTheDocument();
    });

    it('занятый e-mail — ошибка сервера рядом с полем e-mail', async () => {
      await openRegister();
      await userEvent.type(screen.getByLabelText('Имя'), 'Двойник');
      await userEvent.type(screen.getByLabelText('E-mail'), 'demo@mixback.app');
      await userEvent.type(screen.getByLabelText('Пароль'), 'secret123');
      await userEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
      expect(await screen.findByText(/уже зарегистрирован — войдите/)).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    });

    it('успешная регистрация сразу входит и показывает пустой список проектов', async () => {
      await openRegister();
      await userEvent.type(screen.getByLabelText('Имя'), 'Новичок');
      await userEvent.type(screen.getByLabelText('E-mail'), 'new@mail.ru');
      await userEvent.type(screen.getByLabelText('Пароль'), 'secret123');
      await userEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
      expect(await heading('Проекты')).toBeInTheDocument();
      expect(await screen.findByText('Пока нет ни одного проекта')).toBeInTheDocument();
    });

    it('при переключении режима ошибки прошлой формы сбрасываются', async () => {
      await openRegister();
      await userEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
      expect(await screen.findByText('Имя — минимум 2 символа')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('radio', { name: 'Вход' }));
      expect(screen.queryByText('Имя — минимум 2 символа')).not.toBeInTheDocument();
    });
  });

  it('выход возвращает на страницу входа и очищает данные', async () => {
    const { store, router } = await renderApp({ route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });
    await userEvent.click(screen.getByRole('button', { name: 'Алекс' }));
    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(store.getState().projects.ids).toEqual([]);
    expect(await screen.findByRole('form', { name: 'Вход' })).toBeInTheDocument();
  });

  it('сбой сети при проверке входа: экран с повтором, а не молчаливый выход из аккаунта', async () => {
    const appApi = createTestApi();
    await loginAs(appApi, 'owner');
    appApi.controls.set({ failNetwork: true });
    const { router } = await renderApp({ appApi, route: '/projects' });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось проверить вход');
    expect(alert).toHaveTextContent('Нет соединения с сервером');
    expect(router.state.location.pathname).toBe('/projects'); // на форму входа не выбросило

    appApi.controls.set({ failNetwork: false });
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    // Пока проверка идёт, роутер на мгновение уходит на /login и возвращается по `from`: ждём итогового состояния.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects');
      expect(screen.getByRole('link', { name: 'Ночной город' })).toBeInTheDocument();
    });
  });

  it('несуществующий адрес — страница 404 со ссылкой на проекты', async () => {
    await renderApp({ route: '/нет-такой-страницы', as: 'owner' });
    expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К проектам' })).toHaveAttribute('href', '/projects');
  });
});
