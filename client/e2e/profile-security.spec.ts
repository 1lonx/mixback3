import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loginAsDemo, makeWav, openUserMenu, waitForPlayerReady } from './helpers';

const theme = (page: Page) => page.locator('html').getAttribute('data-theme');

test.describe('темы оформления', () => {
  // Playwright по умолчанию эмулирует светлую системную тему — для этого теста нужна тёмная.
  test.use({ colorScheme: 'dark' });

  test('выбор темы запоминается и применяется до отрисовки после перезагрузки', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect.poll(() => theme(page)).toBe('dark');

    await page.getByRole('button', { name: /^Тема: как в системе/ }).click();
    await expect.poll(() => theme(page)).toBe('light');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 244, 246)');

    await page.reload();
    // Тема ставится синхронным скриптом в <head>, поэтому верна уже в момент загрузки страницы.
    await expect.poll(() => theme(page)).toBe('light');
  });

  test('тема «как в системе» следует настройке ОС', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();
    await page.goto('/login');
    await expect.poll(() => theme(page)).toBe('light');
    await context.close();
  });

  test('в светлой теме нет серьёзных нарушений контраста и доступности', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /^Тема: как в системе/ }).click();
    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await waitForPlayerReady(page);
    await page.getByRole('button', { name: 'Собрать из правок' }).click();
    await expect(page.getByRole('region', { name: 'Низ и бас' })).toBeVisible();
    expect(await theme(page)).toBe('light');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('профиль', () => {
  test('смена имени и пароля, затем вход с новым паролем', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await openUserMenu(page);
    await page.getByRole('link', { name: 'Настройки' }).click();
    await expect(page.getByRole('heading', { name: 'Настройки', level: 1 })).toBeVisible();

    await page.getByLabel('Как вас показывать другим участникам').fill('Алекс Миксов');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByRole('button', { name: 'Алекс Миксов' })).toBeVisible();

    await page.getByLabel('Текущий пароль').fill('demo1234');
    await page.getByLabel('Новый пароль', { exact: true }).fill('new-pass-2026');
    await page.getByLabel('Повторите новый пароль').fill('new-pass-2026');
    await expect(page.getByText(/Надёжность пароля/)).toBeVisible();
    await page.getByRole('button', { name: 'Изменить пароль' }).click();
    await expect(page.getByText('Пароль изменён')).toBeVisible();

    await page.getByRole('button', { name: 'Выйти на этом устройстве' }).click();
    await page.getByLabel('E-mail').fill('demo@mixback.app');
    await page.getByLabel('Пароль').fill('demo1234');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByText('Неверный e-mail или пароль')).toBeVisible();

    await page.getByLabel('Пароль').fill('new-pass-2026');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Проекты', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Алекс Миксов' })).toBeVisible();
  });

  test('удаление аккаунта: нужен пароль, после — вход невозможен', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('radio', { name: 'Регистрация' }).click();
    await page.getByLabel('Имя').fill('Временный');
    await page.getByLabel('E-mail').fill('temp-user@mail.ru');
    await page.getByLabel('Пароль').fill('secret123');
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await openUserMenu(page);
    await page.getByRole('link', { name: 'Настройки' }).click();

    await page.getByRole('button', { name: 'Удалить аккаунт' }).click();
    const dialog = page.getByRole('dialog', { name: 'Удалить аккаунт?' });
    await dialog.getByLabel('Пароль').fill('wrong-pass1');
    await dialog.getByRole('button', { name: 'Удалить навсегда' }).click();
    await expect(dialog.getByText('Пароль указан неверно')).toBeVisible();

    await dialog.getByLabel('Пароль').fill('secret123');
    await dialog.getByRole('button', { name: 'Удалить навсегда' }).click();
    await expect(page.getByRole('form', { name: 'Вход' })).toBeVisible();

    await page.getByLabel('E-mail').fill('temp-user@mail.ru');
    await page.getByLabel('Пароль').fill('secret123');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByText('Неверный e-mail или пароль')).toBeVisible();
  });
});

test.describe('безопасность', () => {
  test('production-сборка отдаёт строгую Content-Security-Policy', async ({ page }) => {
    await page.goto('/login');
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    // Скрипты — только свои, без inline: иначе XSS через разметку выполнил бы код.
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  test('основные сценарии не нарушают CSP (в консоли нет блокировок)', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text()))
        violations.push(message.text());
    });
    page.on('pageerror', (error) => violations.push(error.message));

    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await waitForPlayerReady(page);
    await page.getByRole('button', { name: 'Играть' }).click();
    await page.getByLabel('Аудиофайл').setInputFiles(makeWav());
    await page.getByRole('button', { name: 'Загрузить версию' }).click();
    await expect(page.getByText(/Версия v4 загружена/)).toBeVisible();
    await waitForPlayerReady(page);

    expect(violations).toEqual([]);
  });

  test('XSS: HTML в правке показывается текстом и не исполняется', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __xss: boolean }).__xss = false;
    });
    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    const payload = '<img src=x onerror="window.__xss=true"><script>window.__xss=true</script>';
    await page.getByLabel('Что поправить').fill(payload);
    await page.getByRole('button', { name: 'Добавить правку' }).click();

    await expect(page.getByRole('region', { name: 'Правки' }).getByText(payload)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss: boolean }).__xss)).toBe(false);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });

  test('подмена расширения: текстовый файл под видом .mp3 отклоняется', async ({ page }) => {
    await loginAsDemo(page, 'owner');
    await page.getByRole('link', { name: 'Ночной город' }).click();
    await page.getByLabel('Аудиофайл').setInputFiles({
      name: 'song.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('<html><script>alert(1)</script></html> это не музыка'),
    });
    await page.getByRole('button', { name: 'Загрузить версию' }).click();
    await expect(page.getByText(/Содержимое файла не похоже на аудио/)).toBeVisible();
  });

  test('после 5 неверных паролей вход блокируется', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('demo@mixback.app');
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Пароль').fill(`wrong-pass-${i}`);
      await page.getByRole('button', { name: 'Войти', exact: true }).click();
      await expect(page.getByText('Неверный e-mail или пароль')).toBeVisible();
    }
    await page.getByLabel('Пароль').fill('demo1234');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByText(/Слишком много неудачных попыток/)).toBeVisible();
  });
});
