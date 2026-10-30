import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ScrollReveal } from './scroll-reveal';

describe('Scroll reveal safety', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('keeps content visible when the browser cannot animate it', () => {
    TestBed.configureTestingModule({ providers: [ScrollReveal] });
    vi.stubGlobal('IntersectionObserver', undefined);
    const target = document.createElement('article');
    const animationComplete = vi.fn();
    TestBed.inject(ScrollReveal).enter({ target, animationComplete });
    expect(target.classList.contains('scroll-reveal-pending')).toBe(false);
    expect(animationComplete).toHaveBeenCalledOnce();
  });
  it('reveals observed cards and releases detached cards instead of leaving them hidden', async () => {
    let callback: IntersectionObserverCallback;
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = vi.fn();
        unobserve = unobserve;
        disconnect = disconnect;
      },
    );
    TestBed.configureTestingModule({ providers: [ScrollReveal] });
    const reveal = TestBed.inject(ScrollReveal);
    const target = document.createElement('article');
    const animationComplete = vi.fn();
    const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }));
    target.animate = animate as unknown as typeof target.animate;
    reveal.enter({ target, animationComplete });
    expect(target.classList.contains('scroll-reveal-pending')).toBe(true);
    callback!(
      [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await Promise.resolve();
    expect(animate).toHaveBeenCalledOnce();
    expect(target.classList.contains('scroll-reveal-pending')).toBe(false);
    expect(animationComplete).toHaveBeenCalledOnce();
    const finishLeaving = vi.fn();
    reveal.enter({ target, animationComplete: vi.fn() });
    reveal.leave({ target, animationComplete: finishLeaving });
    expect(target.classList.contains('scroll-reveal-pending')).toBe(false);
    expect(finishLeaving).toHaveBeenCalledOnce();
    TestBed.resetTestingModule();
    expect(disconnect).toHaveBeenCalled();
  });
});
