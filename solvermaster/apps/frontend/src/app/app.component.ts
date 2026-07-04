import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly api = inject(ApiService);
  readonly projects = toSignal(this.api.getProjects(), { initialValue: [] });
  readonly tasks = toSignal(this.api.getTasks(), { initialValue: [] });
}
