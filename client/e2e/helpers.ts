import { expect, type Page } from '@playwright/test';

export function makeWav({ seconds = 3, amplitudeDb = -12, sampleRate = 44100 } = {}) {
  const samples = seconds * sampleRate;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  const amplitude = 10 ** (amplitudeDb / 20);
  for (let i = 0; i < samples; i++) {
    const value = amplitude * Math.sin((2 * Math.PI * 997 * i) / sampleRate);
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  return { name: 'e2e-mix.wav', mimeType: 'audio/wav', buffer };
}

export async function loginAsDemo(page: Page, who: 'owner' | 'artist') {
  await page.goto('/login');
  await page
    .getByRole('button', { name: who === 'owner' ? 'Войти как звукорежиссёр' : 'Войти как артист' })
    .click();
  await expect(page.getByRole('heading', { name: 'Проекты', level: 1 })).toBeVisible();
}

export async function openUserMenu(page: Page) {
  await page.getByRole('banner').locator('button[aria-expanded]').click();
}

export async function logout(page: Page) {
  await openUserMenu(page);
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Вход' })).toBeVisible();
}

export async function waitForPlayerReady(page: Page) {
  await expect(page.getByRole('button', { name: 'Играть' })).toBeEnabled({ timeout: 30_000 });
}

export async function sliderValue(page: Page): Promise<number> {
  const value = await page
    .getByRole('slider', { name: 'Позиция воспроизведения' })
    .getAttribute('aria-valuenow');
  return Number(value);
}
