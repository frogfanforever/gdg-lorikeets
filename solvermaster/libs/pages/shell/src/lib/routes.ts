import { Routes } from '@angular/router';
import { AnalysisPage } from '@solvermaster/pages/analysis';
import { MethodsPage } from '@solvermaster/pages/methods';
import { ProblemPage } from '@solvermaster/pages/problem';
import { ResultPage } from '@solvermaster/pages/result';
import { ShortlistPage } from '@solvermaster/pages/shortlist';
import { ShellComponent } from './shell.component';

export const shellRoutes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'problem' },
      { path: 'problem', component: ProblemPage },
      { path: 'methods', component: MethodsPage },
      { path: 'analysis', component: AnalysisPage },
      { path: 'shortlist', component: ShortlistPage },
      { path: 'result', component: ResultPage },
      { path: '**', redirectTo: 'problem' },
    ],
  },
];
