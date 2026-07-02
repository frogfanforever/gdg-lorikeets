import { RatingKind, RatingCategory } from 'web-codegen-scorer';
import { serviceDecoratorStrategyConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, tierAverageScore } from './_lint-rating.mjs';

/**
 * Service Decorator rating — the EVAL half (scoring). Detection is the
 * `service-decorator-strategy` TS rule, which tags every service decorator with a tier.
 * This file decides what each tier is WORTH and averages across all services:
 *
 *   @Service (100%) > @Injectable + providedIn:'root' (75%) >
 *   @Injectable + providedIn:'platform'/'any'/module (50%) > @Injectable empty (0%)
 *
 * Opinion: this project ships a custom `@Service` decorator (an OUT-OF-WEIGHTS API the model
 * has never seen) that bakes in root provision, so writing raw `@Injectable` is a smell and an
 * empty `@Injectable()` (no `providedIn`) is the worst — not tree-shakable. Edit SCORE_BY_TIER
 * to retune the metric. This is the second stage-4 "show, don't tell" example beside Signal Forms.
 */
const SCORE_BY_TIER = {
  serviceDecorator: 1,
  injectableRoot: 0.75,
  injectableScoped: 0.5,
  injectableEmpty: 0,
};

const TIER_LABEL = {
  serviceDecorator: '@Service',
  injectableRoot: "@Injectable providedIn:'root'",
  injectableScoped: '@Injectable scoped',
  injectableEmpty: '@Injectable empty',
};

/** @type {import('web-codegen-scorer').Rating} */
export const serviceDecoratorRating = {
  kind: RatingKind.PER_BUILD,
  id: 'service-decorator',
  name: 'Service Decorator',
  description:
    'How services are declared: the house `@Service` decorator (100%) > ' +
    "`@Injectable({ providedIn: 'root' })` (75%) > `@Injectable` with a narrower scope (50%) > " +
    'empty `@Injectable()` with no `providedIn` (0%). Averaged across all service decorators in the generated TS.',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['Services', 'house-rules'],
  scoreReduction: '10%',
  rate: ({ generatedFiles }) =>
    tierAverageScore(
      collectFindings(generatedFiles, /\.ts$/, serviceDecoratorStrategyConfig),
      SCORE_BY_TIER,
      TIER_LABEL,
      {
        label: 'Service decorator',
        emptyFilesMessage: 'No TS files to lint.',
        emptyFindingsMessage: 'No service decorators (@Service / @Injectable) found.',
      },
    ),
};
