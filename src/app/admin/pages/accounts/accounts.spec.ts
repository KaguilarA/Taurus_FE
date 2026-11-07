import { TestBed } from '@angular/core/testing';
import { beforeEach, vi } from 'vitest';
import { Api } from '../../../api';
import type { StaffAccount } from '../../../interfaces';
import { AccountsPage } from './accounts';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});

async function setup() {
  TestBed.configureTestingModule({ imports: [AccountsPage] });
  const api = TestBed.inject(Api);
  api.state.set(null);
  const own: StaffAccount = { _id: 'owner', name: 'Owner', username: 'owner', role: 'admin' };
  const other: StaffAccount = { _id: 'other', name: 'Other', username: 'other', role: 'waiter' };
  const request = vi.spyOn(api, 'request').mockImplementation(async (path, method, body) => {
    if (method === 'PUT') return { ...other, ...(body as object) } as never;
    return (path === '/admin/me' ? own : [own, other]) as never;
  });
  const fixture = TestBed.createComponent(AccountsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
  fixture.detectChanges();
  const opener = fixture.nativeElement.querySelector(
    '[aria-label="Editar perfil de other"]',
  ) as HTMLButtonElement;
  opener.focus();
  opener.click();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, request, opener };
}

it('opens other users in a modal, saves role changes, and keeps passwords separate', async () => {
  const { fixture, request } = await setup();
  const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  expect(dialog.getAttribute('aria-label')).toBe('Editar usuario: other');
  expect(fixture.nativeElement.querySelector('[aria-label="Editar perfil de owner"]')).toBeNull();
  const role = dialog.querySelector('[name="editRole"]') as HTMLSelectElement;
  role.value = 'kitchen';
  role.dispatchEvent(new Event('change', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  const form = dialog.querySelector('form')!;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
  fixture.detectChanges();
  expect(request).toHaveBeenLastCalledWith('/admin/accounts/other', 'PUT', {
    name: 'Other',
    username: 'other',
    role: 'kitchen',
  });
  expect(fixture.componentInstance.accounts().find((a) => a._id === 'other')?.role).toBe('kitchen');
  expect(dialog.textContent).toContain('La cuenta deberá ingresar de nuevo');
  expect((dialog.querySelector('[name="replacementPassword"]') as HTMLInputElement).value).toBe('');
  fixture.componentInstance.updateField(
    fixture.componentInstance.editing,
    ['name'],
    'Other updated',
  );
  await fixture.componentInstance.saveAccount();
  expect(request).toHaveBeenLastCalledWith('/admin/accounts/other', 'PUT', {
    name: 'Other updated',
    username: 'other',
  });
});

it('keeps errors and unsaved values visible in the editor and returns focus on close', async () => {
  const { fixture, request, opener } = await setup();
  request.mockRejectedValueOnce(new Error('El usuario ya está en uso.'));
  fixture.componentInstance.updateField(
    fixture.componentInstance.editing,
    ['username'],
    'duplicate',
  );
  await fixture.componentInstance.saveAccount();
  fixture.detectChanges();
  const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
  expect(dialog.textContent).toContain('El usuario ya está en uso.');
  expect(fixture.componentInstance.editing()?.username).toBe('duplicate');
  (dialog.querySelector('[aria-label="Cerrar"]') as HTMLButtonElement).click();
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
  expect(document.activeElement).toBe(opener);
});
