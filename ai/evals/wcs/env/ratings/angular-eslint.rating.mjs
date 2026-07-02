import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { angularBestPracticesConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/**
 * Angular ESLint rating — the EVAL half (scoring). Detection is the curated UPSTREAM
 * angular-eslint flat-config in eslint-rules/angular-best-practices.config.mjs. This file
 * runs it over the generated `.ts`/`.html` and docks the score per violation.
 *
 * PER_BUILD (not PER_FILE): PER_FILE *averages* each file's score, so a couple of
 * violations in one file get diluted by all the clean files. PER_BUILD scores on the TOTAL
 * violation count, so violations bite regardless of how many other files are clean.
 */

/** @type {import('web-codegen-scorer').Rating} */
export const angularEslintRating = {
  kind: RatingKind.PER_BUILD,
  id: 'angular-eslint',
  name: 'Angular ESLint',
  description:
    'Runs ESLint + angular-eslint over all generated TS/HTML, enforcing the Angular ' +
    'best practices from the system prompt (inject(), control flow, NgOptimizedImage, ' +
    'no ngStyle/ngClass, a11y, etc.). Scored on total violations across the app.',
  category: RatingCategory.HIGH_IMPACT,
  groupingLabels: ['static-analysis', 'angular-best-practices'],
  scoreReduction: '50%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.(ts|html)$/, angularBestPracticesConfig), {
      noun: 'lint violation(s)',
      emptyFilesMessage: 'No TS/HTML files to lint.',
    }),
};
