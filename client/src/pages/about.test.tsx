import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DB_KEY } from '../api/local/db';
import { renderApp } from '../test/utils';

describe('AboutPage', () => {
  it('доступна без входа и описывает проект и демо-аккаунты', async () => {
    await renderApp({ route: '/about' });
    expect(await screen.findByRole('heading', { name: 'О проекте', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('demo@mixback.app')).toBeInTheDocument();
    expect(screen.getByText('artist@mixback.app')).toBeInTheDocument();
    expect(screen.getByText(/CC0/)).toBeInTheDocument();
  });

  it('настройки демо-режима сохраняются в «сети» мок-API', async () => {
    const { appApi } = await renderApp({ route: '/about' });
    const fail = await screen.findByLabelText(/Имитировать сбой сети/);
    expect(fail).not.toBeChecked();

    await userEvent.click(fail);
    expect(fail).toBeChecked();
    expect(appApi.controls.get().failNetwork).toBe(true);

    await userEvent.selectOptions(screen.getByLabelText('Скорость «сети»'), '1500');
    expect(appApi.controls.get().latencyMs).toBe(1500);
  });

  it('сброс демо-данных: подтверждение, возврат исходных данных и выход из аккаунта', async () => {
    const { appApi, store } = await renderApp({ route: '/about', as: 'owner' });
    await appApi.api.projects.create({ title: 'Временный', artist: 'Х', description: '' });
    expect(appApi.storage.getItem(DB_KEY)).toContain('Временный');

    await userEvent.click(await screen.findByRole('button', { name: 'Сбросить демо-данные' }));
    const dialog = await screen.findByRole('dialog', { name: 'Сбросить демо-данные?' });
    expect(dialog).toHaveTextContent('Вы выйдете из аккаунта');
    await userEvent.click(screen.getByRole('button', { name: 'Сбросить' }));

    expect(await screen.findByText('Демо-данные восстановлены')).toBeInTheDocument();
    await waitFor(() => expect(store.getState().auth.user).toBeNull());
    expect(appApi.storage.getItem(DB_KEY)).not.toContain('Временный');
  });

  it('отмена сброса ничего не удаляет', async () => {
    const { appApi } = await renderApp({ route: '/about', as: 'owner' });
    await appApi.api.projects.create({ title: 'Остаётся', artist: 'Х', description: '' });
    await userEvent.click(await screen.findByRole('button', { name: 'Сбросить демо-данные' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' }),
    );
    expect(appApi.storage.getItem(DB_KEY)).toContain('Остаётся');
  });
});
