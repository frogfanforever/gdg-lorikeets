import {
  HttpBackend,
  HttpEvent,
  HttpRequest,
  HttpResponse,
  HttpXhrBackend,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';

/**
 * Mock HTTP backend for the workshop.
 *
 * This is the SAME mechanism Angular uses for integration testing
 * (`provideHttpClientTesting()` swaps in a fake `HttpBackend`): `HttpBackend` is
 * the lowest layer `HttpClient` talks to — below interceptors — so replacing it
 * lets us answer any request, including `POST` / `PUT` and dynamic `:id` routes.
 *
 * Mutation / dynamic endpoints are answered from canned data here. Everything
 * else (the static `public/*.json` stubs like `/users.json`, `/tabs.json`,
 * `/product.json`) is delegated to the REAL backend, so those keep working.
 *
 * Define the responses once below — there is no logic to maintain.
 */
export class MockHttpBackend implements HttpBackend {
  constructor(private readonly real: HttpXhrBackend) {}

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    // POST .../login  ->  { accessToken }
    if (req.method === 'POST' && req.url.endsWith('/login')) {
      return of(
        new HttpResponse({ status: 200, body: { accessToken: 'mock.jwt.token' } }),
      );
    }

    // GET | PUT .../comments/:id
    const comment = req.url.match(/\/comments\/(\d+)$/);
    if (comment) {
      const id = Number(comment[1]);
      if (req.method === 'GET') {
        return of(
          new HttpResponse({
            status: 200,
            body: {
              id,
              title: 'Sample comment',
              content: 'This is the existing comment content.',
            },
          }),
        );
      }
      if (req.method === 'PUT') {
        // Echo the submitted body back as the saved resource (2xx == success).
        return of(
          new HttpResponse({ status: 200, body: { id, ...(req.body as object) } }),
        );
      }
    }

    // Anything else -> real network (serves the static public/*.json stubs).
    return this.real.handle(req);
  }
}
