import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type Project = {
  readonly id: number;
  readonly name: string;
  readonly description?: string;
  readonly status: string;
};

export type Task = {
  readonly id: number;
  readonly projectId: number;
  readonly title: string;
  readonly done: boolean;
  readonly priority: number;
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.base}/project`);
  }

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.base}/task`);
  }
}
