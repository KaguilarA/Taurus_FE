import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { Component, computed, input, model, signal } from '@angular/core';
import type { Choice } from '../../../interfaces';
@Component({
  selector: 'app-select',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option],
  host: { class: 'relative block min-w-32' },
  templateUrl: './select.html',
})
export class Select<T extends string = string> {
  public readonly label = input.required<string>();
  public readonly options = input.required<readonly Choice<T>[]>();
  public readonly value = model.required<T>();
  public readonly disabled = input(false);
  public readonly expanded = signal(false);
  public readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? 'Seleccionar',
  );
  public select(values: T[]): void {
    if (values[0] === undefined) return;
    this.value.set(values[0]);
    this.expanded.set(false);
  }
}
