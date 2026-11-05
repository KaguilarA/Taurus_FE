import { Directive, inject, signal } from '@angular/core';
import { Api } from '../../../api';
/** Request state belongs to the active page, so errors and forms cannot leak between routes. */
@Directive()
export abstract class AdminTask {
  protected readonly api = inject(Api);
  public readonly busy = signal(false);
  public readonly loading = signal(false);
  public readonly imageUploading = signal(false);
  public readonly error = signal('');
  public readonly notice = signal('');
  protected initialize(task: () => Promise<unknown>): void {
    this.loading.set(true);
    this.run(task).finally(() => this.loading.set(false));
  }
  public async run(task: () => Promise<unknown>, success = ''): Promise<void> {
    if (this.busy() || this.imageUploading()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await task();
      this.notice.set(success);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      this.busy.set(false);
    }
  }
}
