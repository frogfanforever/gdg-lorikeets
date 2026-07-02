import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { reactiveConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/**
 * Reactive Practices rating — the EVAL half (scoring). Detection is the two rules in
 * eslint-rules/reactive/ (require-subscription-teardown, prefer-to-signal). This file just
 * runs them over the generated `.ts` and docks the score per violation.
 */

/** @type {import('web-codegen-scorer').Rating} */
export const reactiveRating = {
  kind: RatingKind.PER_BUILD,
  id: 'reactive-practices',
  name: 'Reactive Practices',
  description:
    'Reactive/SOLID checks: subscriptions must be torn down (take/takeUntil/' +
    'takeUntilDestroyed/async pipe) and observables converted with toSignal() ' +
    'rather than subscribe + .set().',
  category: RatingCategory.HIGH_IMPACT,
  groupingLabels: ['reactive', 'rxjs', 'solid'],
  scoreReduction: '30%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, reactiveConfig), {
      noun: 'reactive-practice violation(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
