import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import MockWaveSurfer from './wavesurferMock';

configure({ asyncUtilTimeout: 5000 });

vi.mock('wavesurfer.js', () => ({ default: MockWaveSurfer }));

// Тесты с `@vitest-environment node` (например, IndexedDB) работают без DOM — ему там нечего настраивать.
if (
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal !== 'function'
) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(() => {
  cleanup();
  MockWaveSurfer.reset();
});
