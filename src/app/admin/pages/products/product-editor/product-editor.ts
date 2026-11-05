import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../../../api';
import { Icon } from '../../../../icon';
import { ImageUpload } from '../../../../image-upload';
import type { Product } from '../../../../interfaces';
import { SERVING_OPTIONS } from '../../../../shared/business';
import { Button, Select } from '../../../../shared/ui';
import { updateField } from '../../../../shared/update-field';
@Component({
  selector: 'app-product-editor',
  imports: [Select, Button, FormsModule, Icon, ImageUpload],
  templateUrl: './product-editor.html',
})
export class ProductEditor {
  private readonly api = inject(Api);
  public readonly product = model.required<Product>();
  public readonly busy = input(false);
  public readonly error = input('');
  public readonly imageUploading = signal(false);
  public readonly save = output<Product>();
  public readonly pending = output<boolean>();
  public readonly updateField = updateField;
  public readonly sizes = SERVING_OPTIONS;
  public readonly types = computed(() => this.api.state()?.productTypes ?? []);
  public readonly categoryOptions = computed(() =>
    this.types()
      .filter((type) => type.active !== false)
      .map((type) => ({ value: type.code, label: type.name })),
  );
  public readonly selectedType = computed(() =>
    this.types().find((type) => type.code === this.product().category),
  );
  public readonly inventoryOptions = computed(() =>
    (this.selectedType()?.inventoryModes ?? []).map((value) => ({
      value,
      label: { none: 'Sin inventario', unit: 'Por unidad', ml: 'Por mililitros' }[value],
    })),
  );
  public readonly drinkOptions = [
    { value: 'non_alcoholic', label: 'Libre de alcohol' },
    { value: 'alcoholic', label: 'Con alcohol' },
  ];
  public changeCategory(code: string): void {
    const type = this.types().find((type) => type.code === code);
    if (!type) return;
    this.product.update((product) => ({
      ...product,
      category: code,
      productType: type._id,
      inventory: type.inventoryModes[0],
      drinkType: type.requiresDrinkType ? product.drinkType : '',
    }));
  }
  public setBottleLiters(value: number): void {
    this.product.update((product) => ({
      ...product,
      bottleLiters: value,
      bottleMl: Math.round(value * 1000),
    }));
  }
}
