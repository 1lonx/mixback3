import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEMO_ARTIST, DEMO_ENGINEERS, DEMO_OWNER, DEMO_PASSWORD } from '../lib/demoAccounts';
import { createTestApi, renderApp, type TestApi } from '../test/utils';

const heading = (name: string | RegExp, level = 1) => screen.findByRole('heading', { name, level });

async function completedOrderWithoutReview(appApi: TestApi) {
  const { api } = appApi;
  const ilya = await api.engineers.get(DEMO_ENGINEERS[0].id);
  await api.auth.login({ email: DEMO_ARTIST.email, password: DEMO_PASSWORD });
  const order = await api.orders.create({
    engineerId: ilya.userId,
    serviceId: ilya.services[0]!.id,
    brief: 'Свести рок-трек, референс прилагаю',
  });
  await api.auth.login({ email: DEMO_ENGINEERS[0].email, password: DEMO_PASSWORD });
  const accepted = await api.orders.act(order.id, 'accept');
  await api.versions.create(accepted.projectId!, {
    file: new Blob(['x']),
    fileName: 'mix.mp3',
    note: '',
    analysis: { durationSec: 10, peaks: [0.1], lufs: -14, peakDb: -1 },
  });
  await api.orders.act(order.id, 'deliver');
  await api.auth.login({ email: DEMO_ARTIST.email, password: DEMO_PASSWORD });
  await api.orders.act(order.id, 'complete');
  return order.id;
}

describe('каталог звукорежиссёров', () => {
  it('открыт гостю и показывает карточки с рейтингом и ценой', async () => {
    await renderApp({ route: '/engineers' });
    expect(await heading('Найдите звукорежиссёра')).toBeInTheDocument();

    const card = (await screen.findByRole('link', { name: 'Илья Громов' })).closest('section')!;
    expect(
      within(card).getByRole('img', { name: /Рейтинг 4,5 из 5, 2 отзыва/ }),
    ).toBeInTheDocument();
    expect(within(card).getByText(/от\s2\s000\s₽/)).toBeInTheDocument();
    expect(within(card).getByText('Рок')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^(?!Mixback)/ }).length).toBeGreaterThan(5);
  });

  it('фильтр по услуге попадает в адрес и сужает список', async () => {
    const { router } = await renderApp({ route: '/engineers' });
    await screen.findByRole('link', { name: 'Илья Громов' });

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Услуга' }), 'vocal');

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Илья Громов' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Марина Соколова' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?kind=vocal');
  });

  it('поиск по имени и пустой результат со сбросом фильтров', async () => {
    await renderApp({ route: '/engineers' });
    await screen.findByRole('link', { name: 'Илья Громов' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск' }), 'кира');
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Илья Громов' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Кира Ветрова' })).toBeInTheDocument();

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Поиск' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск' }), 'zzzz');
    expect(await screen.findByRole('heading', { name: 'Никого не нашли' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(await screen.findByRole('link', { name: 'Илья Громов' })).toBeInTheDocument();
  });

  it('фильтры читаются из адреса, мусор заменяется значениями по умолчанию', async () => {
    await renderApp({ route: '/engineers?genre=Джаз&price=999&sort=hack' });
    expect(await screen.findByRole('link', { name: 'Кира Ветрова' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Жанр' })).toHaveValue('Джаз');
    expect(screen.getByRole('combobox', { name: 'Цена' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('rating');
  });

  it('гостю предлагает войти, вошедшему — открыть свою анкету', async () => {
    const guest = await renderApp({ route: '/engineers' });
    expect(await screen.findByRole('link', { name: 'Стать звукорежиссёром' })).toHaveAttribute(
      'href',
      '/login',
    );
    guest.unmount();

    await renderApp({ route: '/engineers', as: 'artist' });
    expect(await screen.findByRole('link', { name: 'Моя анкета звукорежиссёра' })).toHaveAttribute(
      'href',
      '/profile/engineer',
    );
  });

  it('в шапке «Заказы» и «Проекты» видны только вошедшему', async () => {
    const guest = await renderApp({ route: '/engineers' });
    await screen.findByRole('link', { name: 'Илья Громов' });
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    expect(within(nav).getByRole('link', { name: 'Звукорежиссёры' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Заказы' })).not.toBeInTheDocument();
    guest.unmount();

    await renderApp({ route: '/engineers', as: 'owner' });
    const authedNav = await screen.findByRole('navigation', { name: 'Основная навигация' });
    await within(authedNav).findByRole('link', { name: 'Заказы' });
    expect(within(authedNav).getByRole('link', { name: 'Проекты' })).toBeInTheDocument();
  });
});

describe('профиль звукорежиссёра', () => {
  it('показывает услуги, портфолио и отзывы', async () => {
    await renderApp({ route: `/engineers/${DEMO_ENGINEERS[0].id}` });
    expect(await heading('Илья Громов')).toBeInTheDocument();

    const services = screen.getByRole('heading', { name: 'Услуги', level: 2 }).closest('section')!;
    expect(
      within(services).getByRole('heading', { name: 'Сведение рок-трека' }),
    ).toBeInTheDocument();
    expect(within(services).getByText(/6\s500\s₽/)).toBeInTheDocument();

    const portfolio = screen.getByRole('heading', { name: 'Портфолио' }).closest('section')!;
    const tracks = within(portfolio).getByRole('list', { name: 'Работы' });
    expect(within(tracks).getAllByRole('button')).toHaveLength(3);

    const reviews = screen.getByRole('heading', { name: 'Отзывы' }).closest('section')!;
    expect(within(reviews).getByText(/Гитары звучат мощно/)).toBeInTheDocument();
  });

  it('выбор работы в портфолио переключает активную строку', async () => {
    await renderApp({ route: `/engineers/${DEMO_ENGINEERS[0].id}` });
    const tracks = await screen.findByRole('list', { name: 'Работы' });
    const [first, second] = within(tracks).getAllByRole('button');
    expect(first).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(second!);
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveAttribute('aria-pressed', 'false');
  });

  it('несуществующий звукорежиссёр — понятная ошибка без кнопки повтора', async () => {
    await renderApp({ route: '/engineers/u_nobody' });
    expect(
      await screen.findByRole('heading', { name: 'Звукорежиссёр не найден' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument();
  });

  it('гость при заказе уходит на вход и после входа возвращается на профиль', async () => {
    const { router } = await renderApp({ route: `/engineers/${DEMO_ENGINEERS[0].id}` });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Заказать: Сведение рок-трека' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));

    await userEvent.click(await screen.findByRole('button', { name: 'Войти как артист' }));
    await heading('Илья Громов');
    expect(router.state.location.pathname).toBe(`/engineers/${DEMO_ENGINEERS[0].id}`);
  });

  it('на собственной анкете нет кнопок «Заказать», есть «Редактировать»', async () => {
    await renderApp({ route: `/engineers/${DEMO_OWNER.id}`, as: 'owner' });
    expect(await screen.findByRole('link', { name: 'Редактировать анкету' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Заказать/ })).not.toBeInTheDocument();
  });

  describe('оформление заказа', () => {
    const open = async () => {
      const ctx = await renderApp({ route: `/engineers/${DEMO_ENGINEERS[0].id}`, as: 'artist' });
      await userEvent.click(await screen.findByRole('button', { name: 'Заказать: Мастеринг' }));
      const dialog = await screen.findByRole('dialog', { name: 'Заказ у Илья Громов' });
      return { ...ctx, dialog };
    };

    it('услуга подставляется из нажатой кнопки, цена и срок показаны в сводке', async () => {
      const { dialog } = await open();
      expect(within(dialog).getByRole('combobox', { name: 'Услуга' })).toHaveDisplayValue(
        /Мастеринг/,
      );
      expect(within(dialog).getByText(/Мастеринг · 2\s000\s₽ · срок 2 дня/)).toBeInTheDocument();
    });

    it('короткое описание не отправляется и подсвечивается ошибкой', async () => {
      const { dialog, appApi } = await open();
      await userEvent.type(
        within(dialog).getByRole('textbox', { name: 'Что нужно сделать' }),
        'мало',
      );
      await userEvent.click(within(dialog).getByRole('button', { name: 'Отправить заказ' }));
      expect(await within(dialog).findByText(/минимум 10 символов/)).toBeInTheDocument();
      expect(await appApi.api.orders.list({ side: 'client', status: 'pending' })).toHaveLength(1);
    });

    it('успешный заказ ведёт на его страницу', async () => {
      const { dialog, router } = await open();
      await userEvent.type(
        within(dialog).getByRole('textbox', { name: 'Что нужно сделать' }),
        'Мастеринг готового микса под стриминг',
      );
      await userEvent.click(within(dialog).getByRole('button', { name: 'Отправить заказ' }));

      expect(await heading('Мастеринг')).toBeInTheDocument();
      expect(router.state.location.pathname).toMatch(/^\/orders\/o_/);
      expect(screen.getByText('Ждёт ответа')).toBeInTheDocument();
    });

    it('повторный заказ той же услуги показывает ошибку сервера', async () => {
      const first = await open();
      await userEvent.type(
        within(first.dialog).getByRole('textbox', { name: 'Что нужно сделать' }),
        'Мастеринг готового микса под стриминг',
      );
      await userEvent.click(within(first.dialog).getByRole('button', { name: 'Отправить заказ' }));
      await heading('Мастеринг');

      await first.router.navigate(`/engineers/${DEMO_ENGINEERS[0].id}`);
      await userEvent.click(await screen.findByRole('button', { name: 'Заказать: Мастеринг' }));
      const dialog = await screen.findByRole('dialog', { name: 'Заказ у Илья Громов' });
      await userEvent.type(
        within(dialog).getByRole('textbox', { name: 'Что нужно сделать' }),
        'Ещё раз то же самое, пожалуйста',
      );
      await userEvent.click(within(dialog).getByRole('button', { name: 'Отправить заказ' }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/уже оформлен/);
    });
  });
});

describe('список заказов', () => {
  it('заказчик видит свои заказы со статусом, ценой и именем звукорежиссёра', async () => {
    await renderApp({ route: '/orders', as: 'artist' });
    expect(await heading('Заказы')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Мастеринг под стриминг' });
    const card = link.closest('section')!;
    expect(within(card).getByText('Ждёт ответа')).toBeInTheDocument();
    expect(within(card).getByText('Звукорежиссёр: Алекс')).toBeInTheDocument();
    expect(within(card).getByText(/2\s200\s₽/)).toBeInTheDocument();
  });

  it('переключатель роли и фильтр статуса меняют список и адрес', async () => {
    const { router } = await renderApp({ route: '/orders', as: 'owner' });
    expect(await screen.findByRole('link', { name: 'Сведение рок-трека' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Сведение живого ансамбля' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Мастеринг под стриминг' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Мне заказывают' }));
    expect(await screen.findByRole('link', { name: 'Мастеринг под стриминг' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?side=engineer');
    expect(screen.getAllByText('Заказчик: Лера', { selector: 'p' })).toHaveLength(3);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Статус' }), 'pending');
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Сведение трека до 32 дорожек' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Мастеринг под стриминг' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?side=engineer&status=pending');
  });

  it('гость перенаправляется на вход', async () => {
    const { router } = await renderApp({ route: '/orders' });
    await screen.findByRole('form', { name: 'Вход' });
    expect(router.state.location.pathname).toBe('/login');
  });
});

describe('страница заказа', () => {
  it('звукорежиссёр принимает заказ — появляется проект', async () => {
    await renderApp({ route: '/orders/o_master', as: 'owner' });
    expect(await heading('Мастеринг под стриминг')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Открыть проект' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Принять заказ' }));

    expect(await screen.findByRole('link', { name: 'Открыть проект' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/projects\/p_/),
    );
    expect(screen.getByText('В работе', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сдать работу' })).toBeInTheDocument();
  });

  it('отклонение требует подтверждения', async () => {
    await renderApp({ route: '/orders/o_master', as: 'owner' });
    await userEvent.click(await screen.findByRole('button', { name: 'Отклонить' }));

    const dialog = await screen.findByRole('dialog', { name: 'Отклонить заказ?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Ждёт ответа', { selector: 'span' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Отклонить' }));
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Отклонить заказ?' })).getByRole('button', {
        name: 'Отклонить',
      }),
    );
    expect(await screen.findByText('Отклонён', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Принять заказ' })).not.toBeInTheDocument();
  });

  it('сдача без версий показывает ошибку сервера, статус не меняется', async () => {
    const appApi = createTestApi();
    await appApi.api.auth.login({ email: DEMO_OWNER.email, password: DEMO_PASSWORD });
    await appApi.api.orders.act('o_master', 'accept');
    await renderApp({ appApi, route: '/orders/o_master' });

    await userEvent.click(await screen.findByRole('button', { name: 'Сдать работу' }));
    expect(await screen.findByText(/загрузите в проект хотя бы одну версию/i)).toBeInTheDocument();
    expect(screen.getByText('В работе', { selector: 'span' })).toBeInTheDocument();
  });

  it('заказчик видит шкалу хода заказа и подсказку, но не кнопки звукорежиссёра', async () => {
    await renderApp({ route: '/orders/o_night', as: 'artist' });
    await heading('Сведение трека до 32 дорожек');
    const steps = screen.getByRole('list', { name: 'Ход заказа' });
    expect(within(steps).getByText('В работе')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/Слушайте версии в проекте/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Сдать работу' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть проект' })).toHaveAttribute(
      'href',
      '/projects/p_night',
    );
  });

  it('чужой заказ — 404', async () => {
    const appApi = createTestApi();
    await appApi.api.auth.login({ email: DEMO_ENGINEERS[0].email, password: DEMO_PASSWORD });
    await renderApp({ appApi, route: '/orders/o_night' });
    expect(await screen.findByRole('heading', { name: 'Заказ не найден' })).toBeInTheDocument();
  });

  it('заказчик принимает работу и оставляет отзыв — рейтинг звукорежиссёра растёт', async () => {
    const appApi = createTestApi();
    const orderId = await completedOrderWithoutReview(appApi);
    const before = await appApi.api.engineers.get(DEMO_ENGINEERS[0].id);
    await renderApp({ appApi, route: `/orders/${orderId}` });

    await userEvent.click(await screen.findByRole('button', { name: 'Оставить отзыв' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Поставьте оценку');

    await userEvent.click(screen.getByRole('radio', { name: '5 — Отлично' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Отзыв' }), 'Очень доволен');
    await userEvent.click(screen.getByRole('button', { name: 'Оставить отзыв' }));

    expect(await screen.findByText('Очень доволен')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Оставить отзыв' })).not.toBeInTheDocument();

    const after = await appApi.api.engineers.get(DEMO_ENGINEERS[0].id);
    expect(after.reviewsCount).toBe(before.reviewsCount + 1);
  });
});

describe('анкета звукорежиссёра', () => {
  it('новый пользователь заполняет анкету; портфолио открывается после сохранения', async () => {
    const { appApi } = await renderApp({ route: '/profile/engineer', as: 'artist' });
    expect(await heading('Анкета звукорежиссёра')).toBeInTheDocument();
    expect(
      screen.getByText(/Обложка и портфолио откроются после первого сохранения/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Сохранить анкету' }));
    expect(await screen.findByText(/Заголовок — минимум 5 символов/)).toBeInTheDocument();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Заголовок анкеты' }),
      'Свожу вокал и гитары',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Добавить услугу' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Название' }), 'Сведение трека');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Цена, ₽' }), '3500');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Срок, дней' }), '3');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Рок' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Показывать анкету в каталоге/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить анкету' }));

    expect(await screen.findByText('Анкета сохранена и видна в каталоге')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Портфолио/ })).toBeInTheDocument();

    const catalog = await appApi.api.engineers.list({
      q: '',
      kind: 'all',
      genre: 'Рок',
      maxPrice: 4000,
      sort: 'rating',
    });
    expect(catalog.some((e) => e.userId === DEMO_ARTIST.id)).toBe(true);
  });

  it('ошибка в цене услуги подсвечивается у нужного поля', async () => {
    await renderApp({ route: '/profile/engineer', as: 'owner' });
    const price = (await screen.findAllByRole('spinbutton', { name: 'Цена, ₽' }))[0]!;
    await userEvent.clear(price);
    await userEvent.type(price, '100');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить анкету' }));
    expect(await screen.findByText('Минимальная цена — 500 ₽')).toBeInTheDocument();
  });

  it('публикация без услуг запрещена', async () => {
    await renderApp({ route: '/profile/engineer', as: 'artist' });
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Заголовок анкеты' }),
      'Свожу вокал и гитары',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Показывать анкету в каталоге/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить анкету' }));
    expect(await screen.findByText(/добавьте хотя бы одну услугу/)).toBeInTheDocument();
  });

  it('удаление услуги и работы из портфолио', async () => {
    await renderApp({ route: '/profile/engineer', as: 'owner' });
    expect(await screen.findAllByRole('spinbutton', { name: 'Цена, ₽' })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Удалить услугу 2' }));
    expect(screen.getAllByRole('spinbutton', { name: 'Цена, ₽' })).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Удалить работу «Ночной город»' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Удалить работу «Ночной город»' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Удалить работу «Летний EP — Intro»' }),
    ).toBeInTheDocument();
  });

  it('гость перенаправляется на вход', async () => {
    const { router } = await renderApp({ route: '/profile/engineer' });
    await screen.findByRole('form', { name: 'Вход' });
    expect(router.state.location.pathname).toBe('/login');
  });
});
