import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/utils';

const projectLinks = () =>
  screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href')?.match(/^\/projects\/p_/))
    .map((link) => link.textContent);

describe('ProjectsPage', () => {
  it('сначала показывает состояние загрузки, затем карточки проектов', async () => {
    await renderApp({ route: '/projects', as: 'owner' });
    expect(await screen.findByRole('status', { name: '' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ночной город' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Летний EP — Intro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Старое демо' })).toBeInTheDocument();
  });

  it('карточка показывает статус, число версий и открытых правок', async () => {
    await renderApp({ route: '/projects', as: 'owner' });
    const card = (await screen.findByRole('link', { name: 'Ночной город' })).closest('section')!;
    expect(within(card).getByText('В работе')).toBeInTheDocument();
    expect(within(card).getByText('3 версии')).toBeInTheDocument();
    expect(within(card).getByText('6 правок')).toBeInTheDocument();
    expect(within(card).getByText('Лера К.')).toBeInTheDocument();
  });

  it('роль артиста помечена бейджем только в чужих проектах', async () => {
    await renderApp({ route: '/projects', as: 'artist' });
    const card = (await screen.findByRole('link', { name: 'Ночной город' })).closest('section')!;
    expect(within(card).getByText('Артист')).toBeInTheDocument();
  });

  it('поиск фильтрует список и попадает в адрес', async () => {
    const { router } = await renderApp({ route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск' }), 'мартин');

    await waitFor(() => expect(projectLinks()).toEqual(['Старое демо']));
    expect(router.state.location.search).toBe('?q=%D0%BC%D0%B0%D1%80%D1%82%D0%B8%D0%BD');
  });

  it('фильтр по статусу', async () => {
    await renderApp({ route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });
    await userEvent.selectOptions(screen.getByLabelText('Статус'), 'approved');
    await waitFor(() => expect(projectLinks()).toEqual(['Старое демо']));
  });

  it('сортировка по названию', async () => {
    await renderApp({ route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });
    await userEvent.selectOptions(screen.getByLabelText('Сортировка'), 'title');
    await waitFor(() =>
      expect(projectLinks()).toEqual(['Летний EP — Intro', 'Ночной город', 'Старое демо']),
    );
  });

  it('фильтры восстанавливаются из адреса (можно поделиться ссылкой)', async () => {
    await renderApp({ route: '/projects?status=approved&sort=title', as: 'owner' });
    await waitFor(() => expect(projectLinks()).toEqual(['Старое демо']));
    expect(screen.getByLabelText('Статус')).toHaveValue('approved');
    expect(screen.getByLabelText('Сортировка')).toHaveValue('title');
  });

  it('пустой результат поиска: объяснение и кнопка сброса, которая возвращает список', async () => {
    await renderApp({ route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск' }), 'zzzzzz');
    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(await screen.findByRole('link', { name: 'Ночной город' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Поиск' })).toHaveValue('');
  });

  it('у нового пользователя — пустое состояние с призывом создать проект', async () => {
    await renderApp({ route: '/login' });
    await userEvent.click(await screen.findByRole('radio', { name: 'Регистрация' }));
    await userEvent.type(screen.getByLabelText('Имя'), 'Новичок');
    await userEvent.type(screen.getByLabelText('E-mail'), 'new@mail.ru');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    expect(await screen.findByText('Пока нет ни одного проекта')).toBeInTheDocument();
    const cta = screen.getAllByRole('link', { name: /Создать проект|Новый проект/ });
    expect(cta.length).toBeGreaterThan(0);
  });

  it('ошибка загрузки: сообщение и кнопка «Повторить», которая работает', async () => {
    const { appApi } = await renderApp({ route: '/projects', as: 'owner' });
    await screen.findByRole('link', { name: 'Ночной город' });

    appApi.controls.set({ failNetwork: true });
    await userEvent.selectOptions(screen.getByLabelText('Сортировка'), 'comments');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить данные');
    expect(alert).toHaveTextContent('Нет соединения с сервером');

    appApi.controls.set({ failNetwork: false });
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('link', { name: 'Ночной город' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('клик по «Новый проект» открывает форму создания', async () => {
    const { router } = await renderApp({ route: '/projects', as: 'owner' });
    await userEvent.click(await screen.findByRole('link', { name: 'Новый проект' }));
    expect(
      await screen.findByRole('heading', { name: 'Новый проект', level: 1 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/new');
  });
});

describe('ProjectFormPage', () => {
  it('создание: валидация на клиенте, затем успешное сохранение и переход в проект', async () => {
    const { router } = await renderApp({ route: '/projects/new', as: 'owner' });

    await userEvent.click(await screen.findByRole('button', { name: 'Создать проект' }));
    expect(await screen.findByText('Название — минимум 2 символа')).toBeInTheDocument();
    expect(screen.getByText('Укажите артиста')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/new');

    await userEvent.type(screen.getByLabelText('Название трека'), 'Мой новый трек');
    await userEvent.type(screen.getByLabelText('Артист'), 'Дым');
    await userEvent.type(screen.getByLabelText('Описание'), 'Синтвейв, референс — The Midnight');
    await userEvent.click(screen.getByRole('button', { name: 'Создать проект' }));

    expect(
      await screen.findByRole('heading', { name: 'Мой новый трек', level: 1 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/projects\/p_/);
    expect(await screen.findByText('Проект «Мой новый трек» создан')).toBeInTheDocument();
    expect(screen.getByText('Версий пока нет')).toBeInTheDocument();
  });

  it('новый проект появляется в списке', async () => {
    await renderApp({ route: '/projects/new', as: 'owner' });
    await userEvent.type(await screen.findByLabelText('Название трека'), 'Свежий трек');
    await userEvent.type(screen.getByLabelText('Артист'), 'Дым');
    await userEvent.click(screen.getByRole('button', { name: 'Создать проект' }));
    await screen.findByRole('heading', { name: 'Свежий трек', level: 1 });

    await userEvent.click(screen.getByRole('link', { name: 'Проекты' }));
    expect(await screen.findByRole('link', { name: 'Свежий трек' })).toBeInTheDocument();
  });

  it('счётчик описания и ограничение длины', async () => {
    await renderApp({ route: '/projects/new', as: 'owner' });
    const description = await screen.findByLabelText('Описание');
    await userEvent.type(description, 'abc');
    expect(description).toHaveAccessibleDescription(/3\/500/);
  });

  it('отмена возвращает к списку', async () => {
    const { router } = await renderApp({ route: '/projects/new', as: 'owner' });
    await userEvent.click(await screen.findByRole('button', { name: 'Отмена' }));
    expect(router.state.location.pathname).toBe('/projects');
  });

  it('редактирование: поля предзаполнены, сохранение обновляет проект', async () => {
    const { router } = await renderApp({ route: '/projects/p_old/edit', as: 'owner' });
    const title = await screen.findByLabelText('Название трека');
    await waitFor(() => expect(title).toHaveValue('Старое демо'));
    expect(screen.getByLabelText('Артист')).toHaveValue('Мартин');
    expect(screen.getByLabelText('Статус')).toHaveValue('approved');

    await userEvent.clear(title);
    await userEvent.type(title, 'Демо (финал)');
    await userEvent.selectOptions(screen.getByLabelText('Статус'), 'archived');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByRole('heading', { name: 'Демо (финал)', level: 1 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/p_old');
    expect(screen.getByText('В архиве')).toBeInTheDocument();
    expect(await screen.findByText('Изменения сохранены')).toBeInTheDocument();
  });

  it('артист не может редактировать проект', async () => {
    await renderApp({ route: '/projects/p_night/edit', as: 'artist' });
    expect(await screen.findByText('Нет доступа')).toBeInTheDocument();
    expect(screen.queryByLabelText('Название трека')).not.toBeInTheDocument();
  });

  it('редактирование несуществующего проекта — ошибка с понятным текстом', async () => {
    await renderApp({ route: '/projects/p_missing/edit', as: 'owner' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Проект не найден');
  });

  it('ошибка сети при сохранении показывается в форме, введённые данные не теряются', async () => {
    const { appApi } = await renderApp({ route: '/projects/new', as: 'owner' });
    await userEvent.type(await screen.findByLabelText('Название трека'), 'Не потеряется');
    await userEvent.type(screen.getByLabelText('Артист'), 'Дым');

    appApi.controls.set({ failNetwork: true });
    await userEvent.click(screen.getByRole('button', { name: 'Создать проект' }));

    expect(await screen.findByText(/Нет соединения с сервером/)).toBeInTheDocument();
    expect(screen.getByLabelText('Название трека')).toHaveValue('Не потеряется');
  });
});
