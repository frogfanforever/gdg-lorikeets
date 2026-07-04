import { Routes } from '@angular/router';
import { ChoicePage } from '@solvermaster/pages/choice';
import { ContradictionPage } from '@solvermaster/pages/contradiction';
import { EvaluationPage } from '@solvermaster/pages/evaluation';
import { GenerationPage } from '@solvermaster/pages/generation';
import { MappingPage } from '@solvermaster/pages/mapping';
import { ProblemPage } from '@solvermaster/pages/problem';
import { ShellComponent } from './shell.component';

export const shellRoutes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'problem' },
      { path: 'problem', component: ProblemPage },
      { path: 'contradiction', component: ContradictionPage },
      { path: 'mapping', component: MappingPage },
      { path: 'generation', component: GenerationPage },
      { path: 'evaluation', component: EvaluationPage },
      { path: 'choice', component: ChoicePage },
      { path: '**', redirectTo: 'problem' },
    ],
  },
];
