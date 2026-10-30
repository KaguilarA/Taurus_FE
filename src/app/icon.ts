import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from './icon-names';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <use [attr.href]="'/icons/ui.svg#' + name()" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: var(--icon-size, 18px);
      height: var(--icon-size, 18px);
      flex: 0 0 auto;
      vertical-align: middle;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}
