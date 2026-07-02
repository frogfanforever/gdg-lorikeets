import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { formattingConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/**
 * Prefer Built-in Pipes rating — the EVAL half (scoring). Detection is the
 * `prefer-built-in-pipe` rule in eslint-rules/formatting/. This file runs it over the
 * generated `.ts` and docks the score per violation.
 */

/** @type {import('web-codegen-scorer').Rating} */
export const formattingRating = {
  kind: RatingKind.PER_BUILD,
  id: 'prefer-built-in-pipes',
  name: 'Prefer Built-in Pipes',
  description:
    'Flags manual date/number/currency/case formatting inside components ' +
    '(toFixed, toLocaleDateString, toUpperCase, ...) that should use Angular ' +
    'built-in pipes (DatePipe, CurrencyPipe, DecimalPipe, Upper/LowerCasePipe).',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['formatting', 'angular-best-practices'],
  scoreReduction: '20%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, formattingConfig), {
      noun: 'manual-formatting violation(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
