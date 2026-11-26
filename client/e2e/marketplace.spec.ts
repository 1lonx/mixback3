import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loginAsDemo, makeWav, openUserMenu, waitForPlayerReady } from './helpers';

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`),
    'нарушения доступности',
  ).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'горизонтальная прокрутка').toBeLessThanOrEqual(0);
}

/** Вход по e-mail и паролю — для звукорежиссёров из каталога, у которых нет кнопки быстрого входа. */
async function loginWith(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Пароль').fill('demo1234');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Проекты', level: 1 })).toBeVisible();
}

async function logoutInApp(page: Page) {
  await openUserMenu(page);
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Вход' })).toBeVisible();
}

test.describe('маркетплейс: доступность и вёрстка', () => {
  test('каталог для гостя', async ({ page }) => {
    await page.goto('/engineers');
    await expect(page.getByRole('link', { name: 'Илья Громов' })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  });

  test('профиль звукорежиссёра с портфолио и отзывами', async ({ page }) => {
    await page.goto('/engineers/u_alex');
    await expect(page.getByRole('heading', { name: 'Алекс', level: 1 })).toBeVisible();
    await waitForPlayerReady(page);
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  });

  test('диалог заказа, список и страница заказа, анкета', async ({ page }) => {
    await loginAsDemo(page, 'artist');
    await page.goto('/engineers/u_danil');
    await page.getByRole('button', { name: 'Заказать: Сведение бита с вокалом' }).click();
    await expect(page.getByRole('dialog', { name: 'Заказ у Данил Рейн' })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press('Escape');

    await page.goto('/orders');
    await expect(page.getByRole('link', { name: 'Мастеринг под стриминг' })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('link', { name: 'Мастеринг под стриминг' }).click();
    await expect(
      page.getByRole('heading', { name: 'Мастеринг под стриминг', level: 1 }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);

    await page.goto('/profile/engineer');
    await expect(
      page.getByRole('heading', { name: 'Анкета звукорежиссёра', level: 1 }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('на узком экране каталог и профиль не вылезают за край', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/engineers');
    await expect(page.getByRole('link', { name: 'Илья Громов' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto('/engineers/u_ilya');
    await expect(page.getByRole('heading', { name: 'Илья Громов', level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe('маркетплейс: сценарии', () => {
  test('фильтры каталога живут в адресе и переживают перезагрузку', async ({ page }) => {
    await page.goto('/engineers');
    await page.getByLabel('Услуга').selectOption('mastering');
    await page.getByLabel('Жанр').selectOption('Хип-хоп');
    await expect(page).toHaveURL(/kind=mastering/);
    await expect(page).toHaveURL(/genre=/);
    await expect(page.getByRole('link', { name: 'Данил Рейн' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Илья Громов' })).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel('Услуга')).toHaveValue('mastering');
    await expect(page.getByRole('link', { name: 'Данил Рейн' })).toBeVisible();
  });

  test('весь путь заказа: заказ → принятие → версия → сдача → правки → отзыв', async ({ page }) => {
    // 1. Заказчица (Лера) выбирает Данила и оформляет заказ — гостем начинать нельзя, уходим на вход и возвращаемся
    await page.goto('/engineers/u_danil');
    await page.getByRole('button', { name: 'Заказать: Сведение бита с вокалом' }).click();
    await page.getByRole('button', { name: 'Войти как артист' }).click();
    await expect(page.getByRole('heading', { name: 'Данил Рейн', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Заказать: Сведение бита с вокалом' }).click();
    const dialog = page.getByRole('dialog', { name: 'Заказ у Данил Рейн' });
    await dialog.getByRole('button', { name: 'Отправить заказ' }).click();
    await expect(dialog.getByText(/минимум 10 символов/)).toBeVisible();
    await dialog
      .getByLabel('Что нужно сделать')
      .fill('Свести трек: бит, 808 и вокал, референс прилагаю');
    await dialog.getByRole('button', { name: 'Отправить заказ' }).click();
    await expect(
      page.getByRole('heading', { name: 'Сведение бита с вокалом', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText('Ждёт ответа', { exact: true })).toBeVisible();
    const orderUrl = page.url();
    await logoutInApp(page);

    // 2. Данил видит заказ и принимает его — появляется проект
    await loginWith(page, 'danil@mixback.app');
    await page.goto(orderUrl);
    await expect(page.getByText('Заказчик: Лера').or(page.getByText('Лера'))).toBeVisible();
    await page.getByRole('button', { name: 'Принять заказ' }).click();
    await page.getByRole('link', { name: 'Открыть проект' }).click();
    await expect(page.getByText('Версий пока нет')).toBeVisible();

    // 3. Загружает версию и сдаёт работу
    await page.getByLabel('Аудиофайл').setInputFiles(makeWav());
    await page.getByRole('button', { name: 'Загрузить версию' }).click();
    await expect(page.getByText('Версия v1 загружена')).toBeVisible();
    await page.goto(orderUrl);
    await page.getByRole('button', { name: 'Сдать работу' }).click();
    await expect(page.getByText('Сдан на проверку', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Ждём решения заказчика/)).toBeVisible();
    await logoutInApp(page);

    // 4. Лера слушает, оставляет правку на волне, возвращает на доработку
    await loginAsDemo(page, 'artist');
    await page.goto(orderUrl);
    await page.getByRole('button', { name: 'Нужны правки' }).click();
    await expect(page.getByRole('button', { name: 'Сдать работу' })).toHaveCount(0);
    await expect(page.getByText(/Слушайте версии в проекте/)).toBeVisible();
    await page.getByRole('link', { name: 'Открыть проект' }).click();
    await waitForPlayerReady(page);
    await page.getByLabel('Таймкод', { exact: true }).fill('0:01');
    await page.getByLabel('Что поправить').fill('Вокал тише, чем бит');
    await page.getByRole('button', { name: 'Добавить правку' }).click();
    await expect(page.getByRole('region', { name: 'Правки' })).toContainText('Вокал тише, чем бит');
    await logoutInApp(page);

    // 5. Данил сдаёт повторно, Лера принимает работу и оставляет отзыв
    await loginWith(page, 'danil@mixback.app');
    await page.goto(orderUrl);
    await page.getByRole('button', { name: 'Сдать работу' }).click();
    await expect(page.getByText(/Ждём решения заказчика/)).toBeVisible();
    await logoutInApp(page);

    await loginAsDemo(page, 'artist');
    await page.goto(orderUrl);
    await page.getByRole('button', { name: 'Принять работу' }).click();
    await expect(page.getByRole('heading', { name: 'Отзыв', level: 2 })).toBeVisible();

    await page.getByRole('button', { name: 'Оставить отзыв' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Поставьте оценку' })).toBeVisible();
    await page.getByRole('radio', { name: '5 — Отлично' }).check({ force: true });
    await page.getByRole('textbox', { name: 'Отзыв' }).fill('Бит качает, спасибо!');
    await page.getByRole('button', { name: 'Оставить отзыв' }).click();
    await expect(page.getByText('Бит качает, спасибо!')).toBeVisible();

    // 6. Отзыв виден в профиле, рейтинг пересчитан
    await page.goto('/engineers/u_danil');
    await expect(page.getByText('Бит качает, спасибо!')).toBeVisible();
    await expect(
      page.getByRole('img', { name: /Рейтинг 4,\d из 5, 2 отзыва/ }).first(),
    ).toBeVisible();
  });

  test('новый звукорежиссёр: анкета, услуга, портфолио, появление в каталоге', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('radio', { name: 'Регистрация' }).click();
    await page.getByLabel('Имя').fill('Новый Мастер');
    await page.getByLabel('E-mail').fill('new-master@mail.ru');
    await page.getByLabel('Пароль').fill('secret123');
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await expect(page.getByRole('heading', { name: 'Проекты', level: 1 })).toBeVisible();

    await page.goto('/profile/engineer');
    await page.getByLabel('Заголовок анкеты').fill('Свожу вокал и гитары');
    await page.getByRole('button', { name: 'Добавить услугу' }).click();
    await page.getByLabel('Название', { exact: true }).fill('Сведение трека');
    await page.getByLabel('Цена, ₽').fill('3500');
    await page.getByLabel('Срок, дней').fill('3');
    await page.getByRole('checkbox', { name: 'Рок' }).check();
    await page.getByRole('checkbox', { name: /Показывать анкету в каталоге/ }).check();
    await page.getByRole('button', { name: 'Сохранить анкету' }).click();
    await expect(page.getByText('Анкета сохранена и видна в каталоге')).toBeVisible();

    // Портфолио: настоящий WAV проходит проверку сигнатуры и анализ громкости
    await page.getByLabel('Аудиофайл').setInputFiles(makeWav());
    await page.getByLabel('Название работы').fill('Тестовый микс');
    await page.getByRole('button', { name: 'Добавить работу' }).click();
    await expect(page.getByText('Работа добавлена в портфолио')).toBeVisible();

    await page.goto('/engineers');
    await page.locator('#main').getByRole('link', { name: 'Новый Мастер' }).click();
    await expect(page.getByRole('heading', { name: 'Новый Мастер', level: 1 })).toBeVisible();
    await expect(page.getByText('Сведение трека').first()).toBeVisible();
    await waitForPlayerReady(page);
    await page.getByRole('button', { name: 'Играть' }).click();
    await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
  });

  test('чат по заказу: сообщение заказчицы видит звукорежиссёр, ответ приходит обратно', async ({
    page,
  }) => {
    await loginAsDemo(page, 'artist');
    await page.goto('/orders/o_master');
    const log = page.getByRole('log', { name: 'Переписка' });
    await expect(log).toContainText('принимаете wav 24 бит');
    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Референс пришлю в проект');
    await page.getByRole('textbox', { name: 'Сообщение' }).press('Enter');
    await expect(log).toContainText('Референс пришлю в проект');
    await logoutInApp(page);

    await loginAsDemo(page, 'owner');
    await page.goto('/orders/o_master');
    await expect(page.getByRole('log', { name: 'Переписка' })).toContainText(
      'Референс пришлю в проект',
    );
    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Да, 24 бит подойдёт');
    await page.getByRole('button', { name: 'Отправить' }).click();
    await expect(page.getByRole('log', { name: 'Переписка' })).toContainText('Да, 24 бит подойдёт');
    await expectNoA11yViolations(page);
  });
});

test.describe('обложка анкеты и счётчик', () => {
  test('настоящая картинка сжимается, появляется в каталоге; счётчик виден', async ({ page }) => {
    await loginWith(page, 'ilya@mixback.app');
    await page.goto('/profile/engineer');

    // Большой PNG рисуем в самом браузере: так проверяется настоящее сжатие через canvas.
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 3000;
      canvas.height = 2000;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `hsl(${(i * 37) % 360} 70% 50%)`;
        ctx.fillRect((i * 97) % 3000, (i * 53) % 2000, 300, 200);
      }
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      );
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    await page.getByLabel('Картинка').setInputFiles({
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from(bytes),
    });
    await expect(page.getByRole('img', { name: 'Текущая обложка анкеты' })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);

    await page.goto('/engineers');
    await expect(page.getByText(/Опубликовано анкет/)).toContainText('5');
    await expect(page.locator('img[src^="data:image/jpeg"]').first()).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  });
});

test.describe('главная и меню аккаунта', () => {
  test('логотип ведёт на описание сервиса; вёрстка и доступность', async ({ page }) => {
    await page.goto('/engineers');
    await page.getByRole('link', { name: 'Mixback — на главную' }).click();
    await expect(
      page.getByRole('heading', { name: /Сведение и мастеринг/, level: 1 }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  });

  test('меню аккаунта: пункты, Escape, переход в настройки', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await openUserMenu(page);
    const menu = page.getByRole('banner');
    for (const name of ['Профиль', 'Моя анкета', 'Настройки', 'О проекте']) {
      await expect(menu.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);

    await page.keyboard.press('Escape');
    await expect(menu.getByRole('link', { name: 'Настройки' })).toBeHidden();

    await openUserMenu(page);
    await menu.getByRole('link', { name: 'Настройки' }).click();
    await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Настройки' })).toBeHidden();
  });
});
