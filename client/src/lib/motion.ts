import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { RefObject } from 'react';

gsap.registerPlugin(useGSAP);

/**
 * Анимации отключаются, если пользователь просит «уменьшить движение»
 * (и там, где нет matchMedia — например, в тестах jsdom). Интерфейс при этом полностью рабочий.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Плавное появление дочерних элементов по очереди.
 * `scope` ограничивает селектор текущим компонентом, очистка выполняется автоматически.
 */
export function useReveal(
  scope: RefObject<HTMLElement | null>,
  selector: string,
  dependencies: readonly unknown[] = [],
): void {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const targets = scope.current?.querySelectorAll(selector);
      if (!targets?.length) return;
      gsap.from(targets, {
        opacity: 0,
        y: 18,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.07,
        clearProps: 'opacity,transform',
      });
    },
    { scope, dependencies: [...dependencies] },
  );
}

export { gsap, useGSAP };
