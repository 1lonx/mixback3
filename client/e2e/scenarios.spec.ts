import { expect, test } from '@playwright/test';
import { loginAsDemo, logout, makeWav, sliderValue, waitForPlayerReady } from './helpers';

test.describe('ключевые сценарии (реальный браузер, реальное аудио)', () => {
  test('звукорежиссёр: регистрация → проект → загрузка микса → правка → «решено» → данные переживают перезагрузку', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('radio', { name: 'Регистрация' }).click();
    await page.getByLabel('Имя').fill('Тест Инженер');
    await page.getByLabel('E-mail').fill('e2e-engineer@mail.ru');
    await page.getByLabel('Пароль').fill('secret123');
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await expect(page.getByText('Пока нет ни одного проекта')).toBeVisible();

    await page.getByRole('link', { name: 'Создать проект' }).click();
    await page.getByRole('button', { name: 'Создать проект' }).click();
    await expect(page.getByText('Название — минимум 2 символа')).toBeVisible();
    await page.getByLabel('Название трека').fill('E2E Трек');
    await page.getByLabel('Артист').fill('Дым');
    await page.getByRole('button', { name: 'Создать проект' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Трек', level: 1 })).toBeVisible();
    await expect(page.getByText('Версий пока нет')).toBeVisible();

    await page.getByLabel('Аудиофайл').setInputFiles(makeWav());
    await page.getByLabel('Что изменилось').fill('Первый баланс');
    await page.getByRole('button', { name: 'Загрузить версию' }).click();
    await expect(page.getByText('Версия v1 загружена')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'v1' })).toBeChecked();
    await expect(page.getByText(/−1[45]\.\d LUFS/)).toBeVisible();
    await waitForPlayerReady(page);

    await page.getByLabel('Таймкод', { exact: true }).fill('0:02');
    await page.getByLabel('Что поправить').fill('Бочка бубнит, подрезать низ');
    await page.getByRole('button', { name: 'Добавить правку' }).click();
    const comments = page.getByRole('region', { name: 'Правки' });
    await expect(comments.getByText('Бочка бубнит, подрезать низ')).toBeVisible();
    await expect(page.getByText('Открыто: 1 из 1')).toBeVisible();

    await comments.getByRole('button', { name: 'Решено' }).click();
    await expect(page.getByText('Открыто: 0 из 1')).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const db = JSON.parse(window.localStorage.getItem('mixback:db') ?? '{}') as {
            comments?: { text: string; resolved: boolean }[];
          };
          return db.comments?.find((c) => c.text === 'Бочка бубнит, подрезать низ')?.resolved;
        }),
      )
      .toBe(true);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'E2E Трек', level: 1 })).toBeVisible();
    await expect(page.getByText('Открыто: 0 из 1')).toBeVisible();
    await waitForPlayerReady(page);

    await page.getByRole('link', { name: 'Проекты', exact: true }).click();
    await expect(page.getByRole('link', { name: 'E2E Трек' })).toBeVisible();
  });

  test('артист оставляет правку → звукорежиссёр видит её и собирает AI-чек-лист', async ({
    page,
  }) => {
    await loginAsDemo(page, 'artist');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await expect(page.getByRole('heading', { name: 'Ночной город', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Удалить', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'AI-чек-лист' })).toHaveCount(0);

    await page.getByLabel('Таймкод', { exact: true }).fill('2:00');
    await page.getByLabel('Что поправить').fill('Синтезатор слишком резкий в припеве');
    await page.getByRole('button', { name: 'Добавить правку' }).click();
    await expect(
      page.getByRole('region', { name: 'Правки' }).getByText('Синтезатор слишком резкий в припеве'),
    ).toBeVisible();
    await logout(page);

    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await expect(page.getByText('Синтезатор слишком резкий в припеве')).toBeVisible();

    await page.getByRole('button', { name: 'Собрать из правок' }).click();
    const highs = page.getByRole('region', { name: 'Верха' });
    await expect(highs.getByText('Синтезатор слишком резкий в припеве')).toBeVisible();
    const low = page.getByRole('region', { name: 'Низ и бас' });
    await expect(low).toBeVisible();
    await low.getByRole('checkbox').check();
    await expect(page.getByText(/Выполнено 1 из/)).toBeVisible();
  });

  test('A/B: при переключении версий воспроизведение продолжается с того же места', async ({
    page,
  }) => {
    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await waitForPlayerReady(page);

    await page.getByRole('button', { name: 'Играть' }).click();
    await expect.poll(() => sliderValue(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    const before = await sliderValue(page);

    await page.getByRole('radio', { name: 'v2' }).click();
    await expect(page).toHaveURL(/\?v=2$/);
    await expect(page.getByText('Вокал всё ещё тихий')).toBeVisible();

    await expect.poll(() => sliderValue(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(before);
    await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
  });

  test('сетевая ошибка: понятное сообщение и успешный повтор', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'О проекте' }).click();
    await page.getByLabel(/Имитировать сбой сети/).check();
    await page.getByRole('link', { name: 'Проекты' }).click();
    await expect(page.getByRole('alert')).toContainText('Нет соединения с сервером');

    await page.getByRole('link', { name: 'О проекте' }).click();
    await page.getByLabel(/Имитировать сбой сети/).uncheck();
    await page.getByRole('link', { name: 'Проекты' }).click();
    await expect(page.getByRole('link', { name: 'Ночной город' })).toBeVisible();
  });

  test('после перезагрузки при сбое сети — экран «Не удалось проверить вход» с повтором', async ({
    page,
  }) => {
    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'О проекте' }).click();
    await page.getByLabel(/Имитировать сбой сети/).check();
    await page.goto('/projects');
    await expect(page.getByRole('alert')).toContainText('Не удалось проверить вход');

    await page.evaluate(() => {
      window.localStorage.setItem(
        'mixback:mock',
        JSON.stringify({ latencyMs: 0, failNetwork: false }),
      );
    });
    await page.getByRole('button', { name: 'Повторить' }).click();
    await expect(page.getByRole('link', { name: 'Ночной город' })).toBeVisible();
  });

  test('защита маршрутов: гость перенаправляется на вход, после входа возвращается', async ({
    page,
  }) => {
    await page.goto('/projects/p_night');
    await expect(page.getByRole('form', { name: 'Вход' })).toBeVisible();
    await page.getByRole('button', { name: 'Войти как звукорежиссёр' }).click();
    await expect(page.getByRole('heading', { name: 'Ночной город', level: 1 })).toBeVisible();
  });

  test('несуществующий проект и несуществующая страница', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await page.goto('/projects/p_missing');
    await expect(page.getByRole('alert')).toContainText('Проект не найден');
    await page.goto('/такой-страницы-нет');
    await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  });
});
