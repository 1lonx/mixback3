import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loginAsDemo, waitForPlayerReady } from './helpers';

/** Серьёзные нарушения доступности (WCAG A/AA) должны быть исключены. */
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

test.describe('доступность (axe)', () => {
  test('страница входа', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('form', { name: 'Вход' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('форма регистрации с ошибками валидации', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('radio', { name: 'Регистрация' }).click();
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await expect(page.getByText('Имя — минимум 2 символа')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('список проектов', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await expect(page.getByRole('link', { name: 'Ночной город' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('страница проекта с плеером', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await waitForPlayerReady(page);
    await expectNoA11yViolations(page);
  });

  test('форма проекта и «О проекте»', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await page.goto('/projects/new');
    await expect(page.getByLabel('Название трека')).toBeVisible();
    await expectNoA11yViolations(page);
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'О проекте', level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe('мобильная версия @mobile', () => {
  test('ключевые страницы без горизонтальной прокрутки', async ({ page }) => {
    await page.goto('/login');
    await expectNoHorizontalScroll(page);

    await page.getByRole('button', { name: 'Войти как звукорежиссёр' }).click();
    await expect(page.getByRole('link', { name: 'Ночной город' })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByRole('link', { name: 'Ночной город' }).click();
    await waitForPlayerReady(page);
    await expectNoHorizontalScroll(page);

    await page.goto('/projects/new');
    await expectNoHorizontalScroll(page);
  });

  test('на телефоне можно оставить правку', async ({ page }) => {
    await loginAsDemo(page, 'artist');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await page.getByLabel('Что поправить').fill('Мобильная правка с телефона');
    await page.getByRole('button', { name: 'Добавить правку' }).click();
    await expect(page.getByText('Мобильная правка с телефона').first()).toBeVisible();
  });
});
