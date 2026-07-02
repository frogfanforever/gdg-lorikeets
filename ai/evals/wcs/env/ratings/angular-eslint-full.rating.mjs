import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { angularEslintFullConfig } from '../../eslint-rules/angular-eslint-full.config.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/**
 * FULL angular-eslint rating — Stage 1. Same in-memory scoring as the curated `angular-eslint`
 * rating, but runs the STANDARD full config (eslint-rules/angular-eslint-full.config.mjs), which
 * additionally turns on standalone + change-detection. Scored on total violations across the app.
 */

/** @type {import('web-codegen-scorer').Rating} */
export const angularEslintFullRating = {
  kind: RatingKind.PER_BUILD,
  id: 'angular-eslint-full',
  name: 'Angular ESLint (full standard)',
  description:
    'Runs the full standard angular-eslint recommended rule set over all generated TS/HTML ' +
    '(inject(), control flow, standalone, OnPush change detection, NgOptimizedImage, a11y, …). ' +
    'Scored on total violations across the app.',
  category: RatingCategory.HIGH_IMPACT,
  groupingLabels: ['static-analysis', 'angular-best-practices'],
  scoreReduction: '50%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.(ts|html)$/, angularEslintFullConfig), {
      noun: 'lint violation(s)',
      emptyFilesMessage: 'No TS/HTML files to lint.',
    }),
};
