import { AnimationCallbackEvent, DestroyRef, Injectable, inject } from '@angular/core';

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
  private reducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
  enter(event: AnimationCallbackEvent, column = 0) {
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
      element.classList.remove('scroll-reveal-pending');
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
        void animation.finished.then(finish, finish);
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
    element.classList.add('scroll-reveal-pending');
    this.observer.observe(element);
  }
  leave(event: AnimationCallbackEvent) {
    this.cleanups.get(event.target)?.();
    event.animationComplete();
  }
}
