import { Directive, inject, signal } from '@angular/core';
import { Api } from '../../api';

/** Request state belongs to the active page, so errors and forms cannot leak between routes. */
@Directive()
export abstract class AdminTask {
  readonly api = inject(Api);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly imageUploading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  protected initialize(task: () => Promise<unknown>) {
    this.loading.set(true);
    void this.run(task).finally(() => this.loading.set(false));
  }

  async run(task: () => Promise<unknown>, success = '') {
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
