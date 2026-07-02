import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { componentDecoratorStrategyConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, tierAverageScore } from './_lint-rating.mjs';

/**
 * Change-Detection Strategy rating — the EVAL half (scoring). Detection is the
 * `component-decorator-strategy` TS rule, which tags every @Component with a cd* tier.
 * This file decides what each tier is WORTH and averages across all components:
 *
 *   no changeDetection key (100%) > OnPush (75%) > Default / other (0%)
 *
 * Opinion: in a signals-first Angular app the right change-detection behaviour is implicit,
 * so DECLARING `OnPush` is redundant boilerplate and `Default` opts into zone-based CD. This
 * deliberately inverts angular-eslint's `prefer-on-push-component-change-detection` (disabled
 * in angular-best-practices.config.mjs). Edit SCORE_BY_TIER to retune the metric.
 */
const SCORE_BY_TIER = {
  changeDetectionAbsent: 1,
  changeDetectionOnPush: 0.75,
  changeDetectionDefault: 0,
};

const TIER_LABEL = {
  changeDetectionAbsent: 'implicit (no key)',
  changeDetectionOnPush: 'OnPush',
  changeDetectionDefault: 'Default',
};

/** @type {import('web-codegen-scorer').Rating} */
export const changeDetectionRating = {
  kind: RatingKind.PER_BUILD,
  id: 'change-detection-strategy',
  name: 'Change Detection Strategy',
  description:
    '@Component change detection: no `changeDetection` key (100%) > `OnPush` (75%) > ' +
    '`Default`/other (0%). Averaged across all @Component decorators in the generated TS.',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['Components', 'angular-best-practices'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    tierAverageScore(
      collectFindings(generatedFiles, /\.ts$/, componentDecoratorStrategyConfig),
      SCORE_BY_TIER,
      TIER_LABEL,
      {
        label: 'Change detection',
        emptyFilesMessage: 'No TS files to lint.',
        emptyFindingsMessage: 'No @Component decorators found.',
      },
    ),
};
