import { describe, expect, it } from 'vitest';
import reducer, { dismissToast, pushToast } from './toastsSlice';

describe('toastsSlice', () => {
  it('pushToast добавляет уведомление с уникальным id', () => {
    const a = reducer([], pushToast('success', 'Готово'));
    const b = reducer(a, pushToast('error', 'Ошибка'));
    expect(b).toHaveLength(2);
    expect(b[0]).toMatchObject({ kind: 'success', message: 'Готово' });
    expect(new Set(b.map((t) => t.id)).size).toBe(2);
  });

  it('хранит не больше четырёх: старые вытесняются', () => {
    let state = reducer([], pushToast('info', '1'));
    for (const text of ['2', '3', '4', '5']) state = reducer(state, pushToast('info', text));
    expect(state.map((t) => t.message)).toEqual(['2', '3', '4', '5']);
  });

  it('dismissToast удаляет нужное и не падает на неизвестном id', () => {
    const state = reducer(reducer([], pushToast('info', 'a')), pushToast('info', 'b'));
    const [first] = state;
    expect(reducer(state, dismissToast(first!.id)).map((t) => t.message)).toEqual(['b']);
    expect(reducer(state, dismissToast('нет такого'))).toHaveLength(2);
  });
});
