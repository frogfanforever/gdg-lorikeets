import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { noDecoratorIoConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/** Use input()/output() functions, not @Input()/@Output() decorators. (Ports lowgular input-output.) */
/** @type {import('web-codegen-scorer').Rating} */
export const inputOutputRating = {
  kind: RatingKind.PER_BUILD,
  id: 'input-output',
  name: 'Input and Output',
  description:
    'Use the input()/output()/viewChild() functions for component inputs/outputs/queries; ' +
    'do not use the @Input()/@Output()/@ViewChild() decorators.',
  category: RatingCategory.HIGH_IMPACT,
  groupingLabels: ['Components'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, noDecoratorIoConfig), {
      noun: 'decorator input/output violation(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
