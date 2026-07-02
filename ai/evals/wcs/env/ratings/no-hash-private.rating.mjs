import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { noHashPrivateConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/** Class member visibility: use the `private` keyword, never ECMAScript `#` private members. */
/** @type {import('web-codegen-scorer').Rating} */
export const noHashPrivateRating = {
  kind: RatingKind.PER_BUILD,
  id: 'no-hash-private',
  name: 'No Hash Private',
  description:
    'Use the TypeScript `private` keyword for class members; never ECMAScript `#` private ' +
    'fields/methods. Scored on total `#` members across the app.',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['TypeScript Best Practices'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, noHashPrivateConfig), {
      noun: '`#` private member(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
