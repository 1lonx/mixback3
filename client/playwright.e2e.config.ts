import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * E2E на собранном приложении (vite preview), как у пользователя в production.
 * VITE_MOCK_LATENCY_MS=0 отключает искусственную задержку «сети», чтобы тесты были быстрыми.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/e2e' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    // Анимации GSAP отключаются при reduced-motion — тесты и axe не зависят от кадра анимации.
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { VITE_MOCK_LATENCY_MS: '0' },
  },
});
