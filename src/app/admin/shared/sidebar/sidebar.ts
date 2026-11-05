import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { navigationFor } from '../../../admin-navigation';
import { Icon } from '../../../icon';
@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  host: { class: 'sticky top-0 z-40 block h-dvh min-w-0 self-start' },
  templateUrl: './sidebar.html',
})
export class AdminSidebar {
  public readonly expanded = input(false);
  public readonly businessName = input('Administración');
  public readonly roleName = input('');
  public readonly groups = input.required<ReturnType<typeof navigationFor>>();
  public readonly pending = input(0);
  public readonly lowStock = input(0);
  public readonly loggingOut = input(false);
  public readonly toggled = output<void>();
  public readonly navigated = output<void>();
  public readonly logout = output<void>();
}
