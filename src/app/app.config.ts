import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  NoPreloading,
  provideRouter,
  withPreloading,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { routes } from './app.routes';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(NoPreloading),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withInMemoryScrolling({ anchorScrolling: 'enabled' }),
    ),
  ],
};
