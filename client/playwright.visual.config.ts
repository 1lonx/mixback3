import { defineConfig, devices } from '@playwright/test';

/**
 * Визуальные тесты: каждая story из Storybook сравнивается с эталонным скриншотом.
 * Эталоны лежат в visual/stories.spec.ts-snapshots и зависят от ОС/браузера (Playwright
 * добавляет суффикс платформы), поэтому обновлять их нужно там же, где они проверяются.
 */
export default defineConfig({
  testDir: './visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/visual' }]],
  use: { baseURL: 'http://127.0.0.1:6007', ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  webServer: {
    command:
      'npm run build-storybook && npx vite preview --outDir storybook-static --host 127.0.0.1 --port 6007 --strictPort',
    url: 'http://127.0.0.1:6007/index.json',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
