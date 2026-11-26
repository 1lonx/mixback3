import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DEMO_ARTIST, DEMO_ENGINEERS, DEMO_OWNER, DEMO_PASSWORD } from '../../lib/demoAccounts';
import { ApiError } from '../../lib/errors';
import { createTestApi, renderApp } from '../../test/utils';
import type { Message } from '../../types/domain';
import { ChatView } from './ChatView';

const message = (id: string, authorId: string, text: string): Message => ({
  id,
  orderId: 'o',
  authorId,
  authorName: authorId === 'me' ? 'Я' : 'Собеседник',
  text,
  createdAt: '2026-11-01T10:00:00.000Z',
});

describe('API переписки', () => {
  const setup = () => createTestApi().api;
  const login = (api: ReturnType<typeof setup>, who: { email: string }) =>
    api.auth.login({ email: who.email, password: DEMO_PASSWORD });

  it('участники читают сообщения заказа по времени; посторонний получает 404', async () => {
    const api = setup();
    await login(api, DEMO_ARTIST);
    const list = await api.messages.list('o_night');
    expect(list.map((m) => m.id)).toEqual(['m_seed_1', 'm_seed_2', 'm_seed_3']);

    await login(api, DEMO_ENGINEERS[0]);
    await expect(api.messages.list('o_night')).rejects.toMatchObject({ status: 404 });
    await expect(api.messages.send('o_night', { text: 'привет' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('без входа — 401', async () => {
    await expect(setup().messages.list('o_night')).rejects.toMatchObject({ status: 401 });
  });

  it('отправка добавляет сообщение с именем автора, пустое и слишком длинное отклоняются', async () => {
    const api = setup();
    await login(api, DEMO_OWNER);
    const sent = await api.messages.send('o_master', { text: '  Да, принимаю wav 24 бит  ' });
    expect(sent).toMatchObject({
      authorId: DEMO_OWNER.id,
      authorName: 'Алекс',
      text: 'Да, принимаю wav 24 бит',
    });
    expect((await api.messages.list('o_master')).at(-1)?.id).toBe(sent.id);

    await expect(api.messages.send('o_master', { text: '   ' })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { text: 'Введите сообщение' },
    });
    await expect(api.messages.send('o_master', { text: 'я'.repeat(1001) })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('в закрытом заказе писать нельзя, читать можно', async () => {
    const api = setup();
    await login(api, DEMO_OWNER);
    await api.orders.act('o_master', 'decline');
    const error = await api.messages
      .send('o_master', { text: 'Ещё вопрос' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'ORDER_CLOSED' });
    expect(await api.messages.list('o_master')).toHaveLength(1);
  });

  it('переименование обновляет имя в сообщениях, удаление аккаунта убирает переписку', async () => {
    const api = setup();
    await login(api, DEMO_ARTIST);
    await api.auth.updateProfile({ name: 'Лера Новая' });
    expect((await api.messages.list('o_night'))[0]?.authorName).toBe('Лера Новая');

    await api.auth.deleteAccount({ password: DEMO_PASSWORD });
    await login(api, DEMO_OWNER);
    await expect(api.messages.list('o_night')).rejects.toMatchObject({ status: 404 });
  });
});

describe('ChatView', () => {
  const noop = () => Promise.resolve();

  it('показывает свои и чужие сообщения; имя автора — только у чужих', () => {
    render(
      <ChatView
        currentUserId="me"
        messages={[message('1', 'other', 'Привет!'), message('2', 'me', 'Здравствуйте')]}
        onSend={noop}
      />,
    );
    const log = screen.getByRole('log', { name: 'Переписка' });
    expect(within(log).getAllByRole('listitem')).toHaveLength(2);
    expect(within(log).getByText('Собеседник')).toBeInTheDocument();
    expect(within(log).queryByText('Я')).not.toBeInTheDocument();
  });

  it('пустая переписка, загрузка и ошибка с повтором', async () => {
    const retry = vi.fn();
    const { rerender } = render(<ChatView currentUserId="me" messages={[]} onSend={noop} />);
    expect(screen.getByText(/Сообщений пока нет/)).toBeInTheDocument();

    rerender(<ChatView currentUserId="me" messages={[]} loading onSend={noop} />);
    expect(screen.getByRole('status')).toHaveTextContent('Загружаем переписку');

    rerender(
      <ChatView
        currentUserId="me"
        messages={[]}
        loadError="Нет сети"
        onSend={noop}
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Нет сети');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('Enter отправляет и очищает поле, Shift+Enter переносит строку', async () => {
    const onSend = vi.fn(noop);
    render(<ChatView currentUserId="me" messages={[]} onSend={onSend} />);
    const field = screen.getByRole('textbox', { name: 'Сообщение' });

    await userEvent.type(field, 'первая{Shift>}{Enter}{/Shift}вторая');
    expect(onSend).not.toHaveBeenCalled();
    expect(field).toHaveValue('первая\nвторая');

    await userEvent.type(field, '{Enter}');
    expect(onSend).toHaveBeenCalledWith('первая\nвторая');
    expect(field).toHaveValue('');
  });

  it('пустое сообщение не уходит, ошибка пропадает при вводе', async () => {
    const onSend = vi.fn(noop);
    render(<ChatView currentUserId="me" messages={[]} onSend={onSend} />);
    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Введите сообщение')).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'а');
    expect(screen.queryByText('Введите сообщение')).not.toBeInTheDocument();
  });

  it('при сбое отправки текст остаётся в поле', async () => {
    const onSend = vi.fn(() => Promise.reject(new Error('сбой')));
    render(<ChatView currentUserId="me" messages={[]} onSend={onSend} />);
    const field = screen.getByRole('textbox', { name: 'Сообщение' });
    await userEvent.type(field, 'важное{Enter}');
    expect(onSend).toHaveBeenCalledOnce();
    expect(field).toHaveValue('важное');
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeEnabled();
  });

  it('в закрытом заказе вместо формы — пояснение', () => {
    render(
      <ChatView currentUserId="me" messages={[message('1', 'me', 'ok')]} readOnly onSend={noop} />,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/доступна только для чтения/)).toBeInTheDocument();
  });

  it('работает как управляемый компонент в приложении', async () => {
    function Harness() {
      const [items, setItems] = useState<Message[]>([]);
      return (
        <ChatView
          currentUserId="me"
          messages={items}
          onSend={(text) => {
            setItems((prev) => [...prev, message(String(prev.length), 'me', text)]);
            return Promise.resolve();
          }}
        />
      );
    }
    render(<Harness />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'привет{Enter}');
    expect(within(await screen.findByRole('log')).getByText('привет')).toBeInTheDocument();
  });
});

describe('чат на странице заказа', () => {
  it('показывает историю и отправляет сообщение', async () => {
    const { appApi } = await renderApp({ route: '/orders/o_night', as: 'artist' });
    const log = await screen.findByRole('log', { name: 'Переписка' });
    expect(within(log).getByText(/Версия 3 готова/)).toBeInTheDocument();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Сообщение' }),
      'Спасибо, слушаю!{Enter}',
    );
    expect(await within(log).findByText('Спасибо, слушаю!')).toBeInTheDocument();
    expect((await appApi.api.messages.list('o_night')).at(-1)?.text).toBe('Спасибо, слушаю!');
  });

  it('в закрытом заказе поля ввода нет', async () => {
    const appApi = createTestApi();
    await appApi.api.auth.login({ email: DEMO_OWNER.email, password: DEMO_PASSWORD });
    await appApi.api.orders.act('o_master', 'decline');
    await renderApp({ appApi, route: '/orders/o_master' });
    expect(await screen.findByText(/доступна только для чтения/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Сообщение' })).not.toBeInTheDocument();
  });

  it('сбой отправки показывает уведомление и сохраняет текст', async () => {
    const appApi = createTestApi();
    await renderApp({ appApi, route: '/orders/o_master', as: 'artist' });
    await screen.findByRole('log');
    appApi.controls.set({ failNetwork: true });
    const field = screen.getByRole('textbox', { name: 'Сообщение' });
    await userEvent.type(field, 'Алло?{Enter}');
    expect(await screen.findByText(/Нет соединения с сервером/)).toBeInTheDocument();
    expect(field).toHaveValue('Алло?');
  });
});
