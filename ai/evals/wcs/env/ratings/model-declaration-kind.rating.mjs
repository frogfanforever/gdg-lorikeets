import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { modelDeclarationKindConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, tierAverageScore } from './_lint-rating.mjs';

/**
 * Model Declaration Kind — opinionated tier for how data models are declared
 * (in `*.model.ts`): type alias (100%) > interface (80%) > class (50%). Averaged across
 * all model declarations. The tier→score map below is the eval's opinion.
 */
const SCORE_BY_TIER = { typeAlias: 1, interface: 0.8 };
const TIER_LABEL = { typeAlias: 'type-alias', interface: 'interface' };

/** @type {import('web-codegen-scorer').Rating} */
export const modelDeclarationKindRating = {
  kind: RatingKind.PER_BUILD,
  id: 'model-declaration-kind',
  name: 'Model Declaration Kind',
  description:
    'How data models are declared: type alias (100%) > ' +
    'interface (80%) > class (50%). Averaged across all model declarations.',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['modeling', 'TypeScript Best Practices'],
  scoreReduction: '20%',
  rate: ({ generatedFiles }) =>
    tierAverageScore(
      collectFindings(generatedFiles, /\.ts$/, modelDeclarationKindConfig),
      SCORE_BY_TIER,
      TIER_LABEL,
      {
        label: 'Model kind',
        emptyFilesMessage: 'No model files.',
        emptyFindingsMessage: 'No model declarations found.',
      },
    ),
};
