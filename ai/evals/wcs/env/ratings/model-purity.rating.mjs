import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { modelPurityConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/**
 * Model Purity — data models (in `*.model.ts`) must be pure, immutable data: every property
 * `readonly`, and no methods / getters / setters. Penalty per violation.
 */
/** @type {import('web-codegen-scorer').Rating} */
export const modelPurityRating = {
  kind: RatingKind.PER_BUILD,
  id: 'model-purity',
  name: 'Model Purity',
  description:
    'Data models (*.model.ts) must be pure data: all properties readonly, and no method, ' +
    'getter, or setter declarations.',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['modeling', 'TypeScript Best Practices'],
  scoreReduction: '20%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.model\.ts$/, modelPurityConfig), {
      noun: 'model-purity violation(s)',
      emptyFilesMessage: 'No *.model.ts files.',
    }),
};
