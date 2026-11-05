import { inject, Injectable } from '@angular/core';
import { Api } from '../api';
import type { MenuItem, MenuPage, MenuQuery } from '../interfaces';
@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly api = inject(Api);
  public list(query: MenuQuery, signal: AbortSignal): Promise<MenuPage> {
    const parameters = new URLSearchParams({
      q: query.q,
      category: query.category,
      drinkType: query.drinkType,
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    return this.api.request<MenuPage>('/public/menu?' + parameters, 'GET', undefined, { signal });
  }
  public product(id: string, signal: AbortSignal): Promise<MenuItem> {
    return this.api.request<MenuItem>('/public/menu/' + encodeURIComponent(id), 'GET', undefined, {
      signal,
    });
  }
}
