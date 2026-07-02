import { ɵɵdefineInjectable } from '@angular/core';

/**
 * The project's house service decorator.
 *
 *   @Service()
 *   export class UserService { readonly #http = inject(HttpClient); … }
 *
 * `@Service()` declares a single-responsibility service that is injectable and tree-shakably provided
 * in root — you never write `providedIn`. It sets the Angular injectable definition directly (the same
 * `ɵprov` the compiler would emit for `@Injectable({ providedIn: 'root' })`), so it works under AOT with
 * no arguments. Services use `inject()` for their dependencies (no constructor parameters).
 */
export function Service(): ClassDecorator {
  return ((target: any) => {
    target.ɵprov = ɵɵdefineInjectable({
      token: target,
      providedIn: 'root',
      factory: () => new target(),
    });
    return target;
  }) as ClassDecorator;
}
