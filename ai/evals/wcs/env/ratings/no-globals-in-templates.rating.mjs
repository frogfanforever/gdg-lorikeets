import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { noGlobalsInTemplateConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/** No JS globals in template expressions. (Ports lowgular no-globals-in-templates.) */
/** @type {import('web-codegen-scorer').Rating} */
export const noGlobalsInTemplatesRating = {
  kind: RatingKind.PER_BUILD,
  id: 'no-globals-in-templates',
  name: 'No Globals in Templates',
  description:
    'Do not assume globals like new Date(), Math, window, or document are available in templates.',
  category: RatingCategory.LOW_IMPACT,
  groupingLabels: ['Templates'],
  scoreReduction: '20%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.html$/, noGlobalsInTemplateConfig), {
      noun: 'global-in-template violation(s)',
      emptyFilesMessage: 'No template (.html) files.',
    }),
};
