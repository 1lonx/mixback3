import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/utils';

const trigger = () => screen.findByRole('button', { name: 'Алекс' });

describe('меню аккаунта', () => {
  it('закрыто по умолчанию, раскрывается и показывает имя, e-mail и пункты', async () => {
    await renderApp({ route: '/engineers', as: 'owner' });
    const button = await trigger();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Настройки' })).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(within(panel).getByText('demo@mixback.app')).toBeInTheDocument();
    for (const name of ['Профиль', 'Моя анкета', 'Настройки', 'О проекте']) {
      expect(within(panel).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(within(panel).getByRole('button', { name: 'Выйти' })).toBeInTheDocument();
  });

  it('верхняя карточка с именем ведёт в профиль', async () => {
    const { router } = await renderApp({ route: '/engineers', as: 'owner' });
    await userEvent.click(await trigger());
    await userEvent.click(screen.getByRole('link', { name: /demo@mixback.app/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'));
  });

  it('Escape закрывает меню и возвращает фокус на кнопку', async () => {
    await renderApp({ route: '/engineers', as: 'owner' });
    const button = await trigger();
    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('клик вне меню закрывает его', async () => {
    await renderApp({ route: '/engineers', as: 'owner' });
    const button = await trigger();
    await userEvent.click(button);
    await userEvent.click(screen.getByRole('heading', { name: 'Найдите звукорежиссёра' }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('«О проекте» убран из основной навигации, но есть в меню и подвале', async () => {
    const { router } = await renderApp({ route: '/engineers', as: 'owner' });
    const nav = await screen.findByRole('navigation', { name: 'Основная навигация' });
    expect(within(nav).queryByRole('link', { name: 'О проекте' })).not.toBeInTheDocument();

    const footer = screen.getByRole('navigation', { name: 'О сервисе' });
    await userEvent.click(within(footer).getByRole('link', { name: 'О проекте' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/about'));
  });

  it('логотип ведёт на главную с описанием сервиса', async () => {
    const { router } = await renderApp({ route: '/orders', as: 'owner' });
    await userEvent.click(await screen.findByRole('link', { name: 'Mixback — на главную' }));
    expect(
      await screen.findByRole('heading', { name: /Сведение и мастеринг/, level: 1 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('у гостя вместо меню — кнопка «Войти»', async () => {
    await renderApp({ route: '/' });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: 'Войти' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Алекс' })).not.toBeInTheDocument();
  });
});
