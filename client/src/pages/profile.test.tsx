import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DB_KEY } from '../api/local/db';
import { createTestApi, renderApp } from '../test/utils';

const openProfile = async (as: 'owner' | 'artist' = 'owner') => {
  const view = await renderApp({ route: '/profile', as });
  await screen.findByRole('heading', { name: as === 'owner' ? 'Алекс' : 'Лера', level: 1 });
  return view;
};

const openSettings = async (as: 'owner' | 'artist' = 'owner') => {
  const view = await renderApp({ route: '/settings', as });
  await screen.findByRole('heading', { name: 'Настройки', level: 1 });
  return view;
};

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ProfilePage', () => {
  it('показывает данные пользователя, дату регистрации и статистику', async () => {
    await openProfile();
    expect(screen.getByText('demo@mixback.app')).toBeInTheDocument();
    expect(screen.getByText(/В Mixback с/)).toBeInTheDocument();
    const stats = screen.getByRole('region', { name: 'Статистика' });
    expect(within(stats).getByText('Своих проектов').previousElementSibling).toHaveTextContent('3');
    expect(within(stats).getByText('Загружено версий').previousElementSibling).toHaveTextContent(
      '6',
    );
  });

  it('защищена: гость уходит на вход', async () => {
    const { router } = await renderApp({ route: '/profile' });
    await screen.findByRole('form', { name: 'Вход' });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('профиль и настройки открываются из меню аккаунта', async () => {
    const { router } = await renderApp({ route: '/projects', as: 'owner' });
    await userEvent.click(await screen.findByRole('button', { name: 'Алекс' }));
    await userEvent.click(screen.getByRole('link', { name: 'Профиль' }));
    await screen.findByRole('heading', { name: 'Алекс', level: 1 });
    expect(router.state.location.pathname).toBe('/profile');
    // После перехода меню закрыто
    expect(screen.queryByRole('link', { name: 'Настройки' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Алекс' }));
    await userEvent.click(screen.getByRole('link', { name: 'Настройки' }));
    await screen.findByRole('heading', { name: 'Настройки', level: 1 });
    expect(router.state.location.pathname).toBe('/settings');
  });

  it('сбой сети при загрузке — ошибка с повтором', async () => {
    const appApi = createTestApi();
    const { appApi: api } = await renderApp({ appApi, route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });
    api.controls.set({ failNetwork: true });
    await userEvent.click(screen.getByRole('button', { name: 'Алекс' }));
    await userEvent.click(screen.getByRole('link', { name: 'Профиль' }));
    expect(await screen.findByText('Не удалось загрузить профиль')).toBeInTheDocument();
    api.controls.set({ failNetwork: false });
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('heading', { name: 'Алекс', level: 1 })).toBeInTheDocument();
  });

  describe('имя', () => {
    it('кнопка «Сохранить» неактивна, пока имя не изменено', async () => {
      await openSettings();
      const section = screen.getByRole('heading', { name: 'Имя' }).closest('section')!;
      expect(within(section).getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    });

    it('смена имени обновляется в меню аккаунта', async () => {
      await openSettings();
      const input = screen.getByLabelText('Как вас показывать другим участникам');
      await userEvent.clear(input);
      await userEvent.type(input, 'Алекс Новый');
      await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
      expect(await screen.findByText('Имя обновлено')).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Алекс Новый' })).toBeInTheDocument();
    });

    it('слишком короткое имя — ошибка у поля', async () => {
      await openSettings();
      const input = screen.getByLabelText('Как вас показывать другим участникам');
      await userEvent.clear(input);
      await userEvent.type(input, 'А');
      await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
      expect(await screen.findByText('Имя — минимум 2 символа')).toBeInTheDocument();
    });
  });

  describe('смена пароля', () => {
    const fill = async (current: string, next: string, confirm: string) => {
      await userEvent.type(screen.getByLabelText('Текущий пароль'), current);
      await userEvent.type(screen.getByLabelText('Новый пароль'), next);
      await userEvent.type(screen.getByLabelText('Повторите новый пароль'), confirm);
      await userEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));
    };

    it('индикатор надёжности реагирует на ввод', async () => {
      await openSettings();
      await userEvent.type(screen.getByLabelText('Новый пароль'), 'abc');
      expect(screen.getByText(/Надёжность пароля: очень слабый/)).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText('Новый пароль'), 'Defg1xyz!hij');
      expect(screen.getByText(/Надёжность пароля: (хороший|надёжный)/)).toBeInTheDocument();
    });

    it('пустая отправка показывает ошибки', async () => {
      await openSettings();
      await userEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));
      expect(await screen.findByText('Введите текущий пароль')).toBeInTheDocument();
      expect(screen.getByText('Повторите новый пароль', { selector: 'p' })).toBeInTheDocument();
    });

    it('несовпадение паролей', async () => {
      await openSettings();
      await fill('demo1234', 'new-pass-99', 'new-pass-98');
      expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument();
    });

    it('неверный текущий пароль — ошибка под полем', async () => {
      await openSettings();
      await fill('not-my-pass1', 'new-pass-99', 'new-pass-99');
      expect(await screen.findByText('Текущий пароль указан неверно')).toBeInTheDocument();
      expect(screen.getByLabelText('Текущий пароль')).toHaveAttribute('aria-invalid', 'true');
    });

    it('успех: уведомление, форма очищена, новым паролем можно войти', async () => {
      const { appApi } = await openSettings();
      await fill('demo1234', 'new-pass-99', 'new-pass-99');
      expect(await screen.findByText('Пароль изменён')).toBeInTheDocument();
      expect(screen.getByLabelText('Текущий пароль')).toHaveValue('');
      await appApi.api.auth.logout();
      await expect(
        appApi.api.auth.login({ email: 'demo@mixback.app', password: 'new-pass-99' }),
      ).resolves.toBeTruthy();
    });

    it('блокировка после серии неверных паролей объясняется пользователю', async () => {
      await openSettings();
      for (let i = 0; i < 5; i++) {
        await userEvent.clear(screen.getByLabelText('Текущий пароль'));
        await fill('wrong-pass1', 'new-pass-99', 'new-pass-99');
        await screen.findByText('Текущий пароль указан неверно');
        await userEvent.clear(screen.getByLabelText('Новый пароль'));
        await userEvent.clear(screen.getByLabelText('Повторите новый пароль'));
      }
      await userEvent.clear(screen.getByLabelText('Текущий пароль'));
      await fill('demo1234', 'new-pass-99', 'new-pass-99');
      expect(await screen.findByText(/Слишком много неудачных попыток/)).toBeInTheDocument();
    });
  });

  describe('оформление', () => {
    it('выбор темы применяется сразу и запоминается', async () => {
      await openSettings();
      await userEvent.click(screen.getByRole('radio', { name: 'Светлая' }));
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(window.localStorage.getItem('mixback:theme')).toBe('light');
      await userEvent.click(screen.getByRole('radio', { name: 'Тёмная' }));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('кнопка в шапке переключает тему по кругу и подписана', async () => {
      await openSettings();
      const toggle = screen.getByRole('button', { name: /^Тема: как в системе/ });
      await userEvent.click(toggle);
      expect(screen.getByRole('button', { name: /^Тема: светлая/ })).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      await userEvent.click(screen.getByRole('button', { name: /^Тема: светлая/ }));
      expect(screen.getByRole('button', { name: /^Тема: тёмная/ })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^Тема: тёмная/ }));
      expect(screen.getByRole('button', { name: /^Тема: как в системе/ })).toBeInTheDocument();
    });

    it('выбор синхронизирован: радиокнопки отражают смену темы из шапки', async () => {
      await openSettings();
      await userEvent.click(screen.getByRole('button', { name: /^Тема: как в системе/ }));
      expect(screen.getByRole('radio', { name: 'Светлая' })).toBeChecked();
    });
  });

  describe('безопасность', () => {
    it('показывает срок сессии и выход на этом устройстве', async () => {
      const { router } = await openSettings();
      expect(screen.getByText('Сессия действует до')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Выйти на этом устройстве' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    });
  });

  describe('удаление аккаунта', () => {
    const openDialog = async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }));
      return screen.findByRole('dialog', { name: 'Удалить аккаунт?' });
    };

    it('требует пароль и показывает e-mail аккаунта', async () => {
      await openSettings();
      const dialog = await openDialog();
      expect(dialog).toHaveTextContent('demo@mixback.app');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить навсегда' }));
      expect(
        await within(dialog).findByText('Введите пароль для подтверждения'),
      ).toBeInTheDocument();
    });

    it('неверный пароль: аккаунт не удалён, ошибка в диалоге', async () => {
      const { appApi } = await openSettings();
      const dialog = await openDialog();
      await userEvent.type(within(dialog).getByLabelText('Пароль'), 'wrong-pass1');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить навсегда' }));
      expect(await within(dialog).findByText('Пароль указан неверно')).toBeInTheDocument();
      expect(await appApi.api.auth.me()).not.toBeNull();
    });

    it('отмена закрывает диалог и сбрасывает введённое', async () => {
      await openSettings();
      let dialog = await openDialog();
      await userEvent.type(within(dialog).getByLabelText('Пароль'), 'secret');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
      dialog = await openDialog();
      expect(within(dialog).getByLabelText('Пароль')).toHaveValue('');
    });

    it('успех: данные удалены, пользователь на странице входа, состояние очищено', async () => {
      const { appApi, store, router } = await openSettings();
      const dialog = await openDialog();
      await userEvent.type(within(dialog).getByLabelText('Пароль'), 'demo1234');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Удалить навсегда' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
      expect(store.getState().auth.user).toBeNull();
      expect(store.getState().profile.data).toBeNull();
      expect(appApi.storage.getItem(DB_KEY)).not.toContain('demo@mixback.app');
    });
  });

  it('артист видит свою статистику', async () => {
    await openProfile('artist');
    const stats = screen.getByRole('region', { name: 'Статистика' });
    expect(
      within(stats).getByText('Проектов, где вы артист').previousElementSibling,
    ).toHaveTextContent('1');
    expect(within(stats).getByText('Оставлено правок').previousElementSibling).toHaveTextContent(
      '7',
    );
  });
});
