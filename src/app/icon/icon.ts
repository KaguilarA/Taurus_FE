import { Component, input } from '@angular/core';
import type { IconName } from '../interfaces';
@Component({
  selector: 'app-icon',
  host: {
    class:
      'inline-flex w-[var(--icon-size,_18px)] h-[var(--icon-size,_18px)] [flex:0_0_auto] [vertical-align:middle]',
    'aria-hidden': 'true',
  },
  templateUrl: './icon.html',
})
export class Icon {
  public readonly name = input.required<IconName>();
}
