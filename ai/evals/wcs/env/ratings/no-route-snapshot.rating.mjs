import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { noRouteSnapshotConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, penaltyScore } from './_lint-rating.mjs';

/** No ActivatedRoute.snapshot — use the reactive paramMap/params instead. */
/** @type {import('web-codegen-scorer').Rating} */
export const noRouteSnapshotRating = {
  kind: RatingKind.PER_BUILD,
  id: 'no-route-snapshot',
  name: 'No ActivatedRoute Snapshot',
  description:
    'Do not read route state via ActivatedRoute.snapshot (it does not react to navigation). ' +
    'Use the reactive paramMap / params / queryParamMap (piped or via toSignal).',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['reactive', 'routing'],
  scoreReduction: '20%',
  rate: ({ generatedFiles }) =>
    penaltyScore(collectFindings(generatedFiles, /\.ts$/, noRouteSnapshotConfig), {
      noun: 'ActivatedRoute.snapshot violation(s)',
      emptyFilesMessage: 'No TS files to lint.',
    }),
};
