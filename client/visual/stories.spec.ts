import { expect, test } from '@playwright/test';

interface StoryIndex {
  entries: Record<string, { id: string; type: 'story' | 'docs'; title: string; name: string }>;
}

const THEMES = ['dark', 'light'] as const;

test.describe('визуальные состояния компонентов', () => {
  let stories: { id: string; title: string; name: string }[] = [];

  test.beforeAll(async ({ request }) => {
    const response = await request.get('/index.json');
    const index = (await response.json()) as StoryIndex;
    stories = Object.values(index.entries).filter((entry) => entry.type === 'story');
  });

  test('в Storybook есть истории', () => {
    expect(stories.length).toBeGreaterThanOrEqual(10);
  });

  for (const theme of THEMES) {
    test(`каждая story совпадает с эталоном — ${theme === 'dark' ? 'тёмная' : 'светлая'} тема`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      for (const story of stories) {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
        await page.waitForSelector('#storybook-root > div');
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect
          .soft(page.locator('#storybook-root > div'), `${story.title} / ${story.name}`)
          .toHaveScreenshot(`${story.id}-${theme}.png`);
      }
    });
  }
});
