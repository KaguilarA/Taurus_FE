import { Listbox, Option } from '@angular/aria/listbox';
import { Component, input, model } from '@angular/core';
import type { Choice } from '../../../interfaces';
@Component({
  selector: 'app-choice-list',
  imports: [Listbox, Option],
  host: { class: 'block' },
  templateUrl: './choice-list.html',
})
export class ChoiceList<T extends string = string> {
  public readonly label = input.required<string>();
  public readonly options = input.required<readonly Choice<T>[]>();
  public readonly value = model.required<T>();
  public readonly disabled = input(false);
  public select(values: T[]): void {
    if (values[0] !== undefined) this.value.set(values[0]);
  }
}
