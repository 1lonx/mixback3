import { vi } from 'vitest';
import type { MixbackApi } from '../api/types';
import { ApiError } from '../lib/errors';

type Deep<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? ReturnType<typeof vi.fn<(...args: A) => R>>
    : Deep<T[K]>;
};

export function createFakeApi(): Deep<MixbackApi> {
  const unset = (name: string) =>
    vi.fn(() => Promise.reject(new Error(`fakeApi.${name} не настроен в тесте`)));

  return {
    auth: {
      register: unset('auth.register'),
      login: unset('auth.login'),
      logout: unset('auth.logout'),
      me: unset('auth.me'),
      profile: unset('auth.profile'),
      updateProfile: unset('auth.updateProfile'),
      changePassword: unset('auth.changePassword'),
      deleteAccount: unset('auth.deleteAccount'),
    },
    projects: {
      list: unset('projects.list'),
      get: unset('projects.get'),
      create: unset('projects.create'),
      update: unset('projects.update'),
      remove: unset('projects.remove'),
      invite: unset('projects.invite'),
    },
    versions: { create: unset('versions.create'), audioUrl: unset('versions.audioUrl') },
    comments: {
      list: unset('comments.list'),
      create: unset('comments.create'),
      update: unset('comments.update'),
      remove: unset('comments.remove'),
    },
    checklist: {
      get: unset('checklist.get'),
      generate: unset('checklist.generate'),
      toggle: unset('checklist.toggle'),
    },
    engineers: {
      list: unset('engineers.list'),
      get: unset('engineers.get'),
      mine: unset('engineers.mine'),
      save: unset('engineers.save'),
      count: unset('engineers.count'),
      setCover: unset('engineers.setCover'),
      addTrack: unset('engineers.addTrack'),
      removeTrack: unset('engineers.removeTrack'),
    },
    orders: {
      list: unset('orders.list'),
      get: unset('orders.get'),
      create: unset('orders.create'),
      act: unset('orders.act'),
      review: unset('orders.review'),
    },
    messages: { list: unset('messages.list'), send: unset('messages.send') },
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const serverError = (status = 500, message = 'Ошибка сервера') =>
  new ApiError(status, 'ERR', message);
