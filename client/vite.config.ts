/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Content-Security-Policy для production-сборки (в dev её нет: Vite HMR использует inline-скрипты).
 * Статический хостинг вроде GitHub Pages не умеет отдавать заголовки, поэтому политика — в <meta>.
 * Директивы frame-ancestors и report-uri через <meta> не работают — они в public/_headers.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // React-атрибуты style={{…}} (позиция флажков, аватар)
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'mixback-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

// VITE_BASE нужен для GitHub Pages: приложение лежит в подпапке /mixback-app/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), cspPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: { modules: { localsConvention: 'camelCase' } },
  build: {
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    include: ['src/**/*.test.{ts,tsx}'],
    // PBKDF2 в мок-API намеренно тяжёлый: при параллельном запуске всех файлов тесты с серией входов медленнее.
    testTimeout: 15_000,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.stories.tsx',
        'src/test/**',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/types/**',
      ],
      thresholds: { lines: 80, functions: 75, branches: 70, statements: 80 },
    },
  },
});
