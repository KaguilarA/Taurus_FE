import { computed, Directive, input } from '@angular/core';
const variants = {
  primary: 'border-transparent bg-accent text-canvas hover:enabled:brightness-110',
  secondary: 'border-border bg-surface-raised text-warm hover:enabled:brightness-110',
  outline: 'border-border bg-transparent text-warm hover:enabled:bg-surface-raised',
};
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: {
    class:
      'inline-flex min-h-11 items-center justify-center gap-2.5 rounded-lg border px-5 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
    '[class]': 'variantClasses()',
  },
})
export class Button {
  public readonly appButton = input<keyof typeof variants>('primary');
  public readonly variantClasses = computed(() => variants[this.appButton()]);
}
