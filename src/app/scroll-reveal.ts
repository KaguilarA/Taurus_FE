import { AnimationCallbackEvent, DestroyRef, Injectable, inject } from '@angular/core';
const REVEAL_CLASSES = [
  'scroll-reveal-pending',
  'opacity-0',
  '[transform:translateY(14px)]',
  '[&:focus-within]:opacity-100',
  '[&:focus-within]:[transform:none]',
  '[@media(prefers-reduced-motion:_reduce)]:opacity-100!',
  '[@media(prefers-reduced-motion:_reduce)]:[transform:none]!',
  '[@media(print)]:opacity-100!',
  '[@media(print)]:[transform:none]!',
];
@Injectable()
export class ScrollReveal {
  private observer?: IntersectionObserver;
  private readonly pending = new Map<Element, () => void>();
  private readonly cleanups = new Map<Element, () => void>();
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const finish of [...this.cleanups.values()]) finish();
      this.observer?.disconnect();
    });
  }
  private reducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
  public enter(event: AnimationCallbackEvent, column = 0): void {
    const element = event.target as HTMLElement;
    if (
      this.reducedMotion() ||
      typeof IntersectionObserver === 'undefined' ||
      typeof element.animate !== 'function'
    ) {
      event.animationComplete();
      return;
    }
    let animation: Animation | undefined;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      element.classList.remove(...REVEAL_CLASSES);
      animation?.cancel();
      this.observer?.unobserve(element);
      this.pending.delete(element);
      this.cleanups.delete(element);
      event.animationComplete();
    };
    const play = () => {
      this.pending.delete(element);
      this.observer?.unobserve(element);
      if (this.reducedMotion() || element.contains(document.activeElement)) {
        finish();
        return;
      }
      try {
        animation = element.animate(
          [
            { opacity: 0, transform: 'translateY(14px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 320,
            delay: (column % 3) * 45,
            easing: 'cubic-bezier(.2,.7,.2,1)',
            fill: 'both',
          },
        );
        animation.finished.then(finish, finish);
      } catch {
        finish();
      }
    };
    if (!this.observer)
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) if (entry.isIntersecting) this.pending.get(entry.target)?.();
        },
        { threshold: 0.08, rootMargin: '0px 0px -24px 0px' },
      );
    this.cleanups.get(element)?.();
    this.cleanups.set(element, finish);
    this.pending.set(element, play);
    element.classList.add(...REVEAL_CLASSES);
    this.observer.observe(element);
  }
  public leave(event: AnimationCallbackEvent): void {
    this.cleanups.get(event.target)?.();
    event.animationComplete();
  }
}
