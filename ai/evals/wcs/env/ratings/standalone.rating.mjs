import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { componentDecoratorStrategyConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, tierAverageScore } from './_lint-rating.mjs';

/**
 * Standalone Declaration rating — the EVAL half (scoring). Detection is the
 * `component-decorator-strategy` TS rule, which tags every @Component with a standalone* tier.
 * This file decides what each tier is WORTH and averages across all components:
 *
 *   no standalone key (100%) > standalone: true (75%) > standalone: false (0%)
 *
 * Opinion: standalone is the default in modern Angular, so DECLARING `standalone: true` is
 * redundant boilerplate and `standalone: false` opts back into NgModules. This deliberately
 * goes beyond angular-eslint's `prefer-standalone` (disabled in angular-best-practices.config.mjs),
 * which can't distinguish "absent" from "true". Edit SCORE_BY_TIER to retune the metric.
 */
const SCORE_BY_TIER = {
  standaloneAbsent: 1,
  standaloneTrue: 0.75,
  standaloneFalse: 0,
};

const TIER_LABEL = {
  standaloneAbsent: 'implicit (no key)',
  standaloneTrue: 'standalone: true',
  standaloneFalse: 'standalone: false',
};

/** @type {import('web-codegen-scorer').Rating} */
export const standaloneRating = {
  kind: RatingKind.PER_BUILD,
  id: 'standalone-declaration',
  name: 'Standalone Declaration',
  description:
    '@Component standalone declaration: no `standalone` key (100%) > `standalone: true` ' +
    '(75%) > `standalone: false` (0%). Averaged across all @Component decorators in the generated TS.',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['Components', 'angular-best-practices'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    tierAverageScore(
      collectFindings(generatedFiles, /\.ts$/, componentDecoratorStrategyConfig),
      SCORE_BY_TIER,
      TIER_LABEL,
      {
        label: 'Standalone',
        emptyFilesMessage: 'No TS files to lint.',
        emptyFindingsMessage: 'No @Component decorators found.',
      },
    ),
};
