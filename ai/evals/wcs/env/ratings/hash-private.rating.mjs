import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { hashPrivateConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/** Class member visibility: use ECMAScript `#` private members, never the `private` keyword. */
/** @type {import('web-codegen-scorer').Rating} */
export const hashPrivateRating = {
  kind: RatingKind.PER_BUILD,
  id: 'hash-private',
  name: 'Hash Private',
  description:
    'Use ECMAScript `#` private fields/methods for class member privacy; never the TypeScript ' +
    '`private` keyword. Scored on total `private`-keyword members across the app.',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['TypeScript Best Practices'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, hashPrivateConfig), {
      noun: '`private`-keyword member(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
