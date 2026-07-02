import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { pureStateConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/** Keep computed()/update() callbacks pure. (Ports lowgular pure-state-transformations.) */
/** @type {import('web-codegen-scorer').Rating} */
export const pureStateTransformationsRating = {
  kind: RatingKind.PER_BUILD,
  id: 'pure-state-transformations',
  name: 'Pure State Transformations',
  description:
    'Inside computed() and update() callbacks, keep transformations pure: no this.<x> = ... assignments.',
  category: RatingCategory.HIGH_IMPACT,
  groupingLabels: ['State Management'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, pureStateConfig), {
      noun: 'impure-transformation violation(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
