import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { reportConnection } from './app/connection-diagnostics';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch(() => reportConnection('BOOT_ERROR'));
