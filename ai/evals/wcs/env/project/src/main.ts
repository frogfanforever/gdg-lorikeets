import { bootstrapApplication } from '@angular/platform-browser';
import { XhrFactory } from '@angular/common';
import { HttpBackend, HttpXhrBackend } from '@angular/common/http';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { MockHttpBackend } from './mock-backend';

// Swap the HTTP backend for the workshop mock (see mock-backend.ts) — the same
// technique as Angular's provideHttpClientTesting(). Appended AFTER the generated
// appConfig providers so it always wins, and lives in main.ts which the generator
// is told never to touch.
bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    {
      provide: HttpBackend,
      useFactory: (xhrFactory: XhrFactory) =>
        new MockHttpBackend(new HttpXhrBackend(xhrFactory)),
      deps: [XhrFactory],
    },
  ],
}).catch((err) => console.error(err));
