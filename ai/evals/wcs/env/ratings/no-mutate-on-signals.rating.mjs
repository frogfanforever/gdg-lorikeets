import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { noMutateConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/** Writable signals: use set()/update(), never mutate(). (Ports lowgular no-mutate-on-signals.) */
/** @type {import('web-codegen-scorer').Rating} */
export const noMutateOnSignalsRating = {
  kind: RatingKind.PER_BUILD,
  id: 'no-mutate-on-signals',
  name: 'No Mutate on Signals',
  description:
    'For writable signals, use set() or update() to change values. Do not use mutate().',
  category: RatingCategory.HIGH_IMPACT,
  groupingLabels: ['State Management'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, noMutateConfig), {
      noun: 'mutate()-on-signal violation(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
