import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../../../icon';
@Component({
  selector: 'app-dialog',
  imports: [Icon],
  templateUrl: './dialog.html',
})
export class Dialog {
  public readonly title = input.required<string>();
  public readonly busy = input(false);
  public readonly closed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.dialog().nativeElement;
      const opener = element.ownerDocument.activeElement;
      element.showModal();
      destroyRef.onDestroy(() => {
        element.close();
        if (opener instanceof HTMLElement && opener.isConnected)
          opener.focus({ preventScroll: true });
      });
    });
  }
  public cancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
  public backdrop(event: MouseEvent): void {
    const dialog = this.dialog().nativeElement;
    if (event.target !== dialog || this.busy()) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      this.closed.emit();
  }
}
