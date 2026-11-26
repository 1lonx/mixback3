// GitHub Pages не знает про клиентские маршруты: на /projects/1 отдаст 404.
// Копия index.html как 404.html заставляет Pages отдавать SPA на любой путь.
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html не найден — сначала выполните vite build');
  process.exit(1);
}
copyFileSync('dist/index.html', 'dist/404.html');
console.log('dist/404.html создан (SPA fallback для GitHub Pages)');
