import { RatingKind, RatingCategory, RatingState } from 'web-codegen-scorer';
import { formStrategyConfig } from '../../eslint-rules/index.mjs';
import { collectFindings, tierAverageScore } from './_lint-rating.mjs';

/**
 * Form Strategy rating — the EVAL half (scoring). Detection is the `form-strategy` template
 * rule in eslint-rules/forms/; it tags each form binding with a tier messageId. This file
 * decides what each tier is WORTH and averages them:
 *
 *   signal (formField) 100% > reactive 75% > template-driven (ngModel) 50% > manual [value] 0%
 *
 * SCORE_BY_TIER is the eval's opinion — edit here to retune the metric. Ported from
 * lowgular-internal's `form-binding` rating, no-fork (inline angular-eslint over `.html`).
 *
 * ON TOP of the tier average, a SUBMISSION penalty: with Signal Forms, `[formRoot]` owns
 * submission via the `submission.action` option, so a `(submit)`/`(ngSubmit)` handler on a
 * `[formRoot]` form (rule messageId `manualSubmit`) is docked a flat MANUAL_SUBMIT_PENALTY per
 * occurrence. It's a per-FORM correctness slip, orthogonal to which binding primitive is used —
 * so it's applied as a fixed penalty, NOT averaged into the per-binding tiers (whose count would
 * otherwise dilute it). 0.2 keeps an otherwise-perfect signal form (80%) just above the reactive
 * tier: the binding is still modern, but the submission is wrong.
 */
const SCORE_BY_TIER = {
  signal: 1,
  reactive: 0.75,
  templateDriven: 0.5,
  html: 0,
};

const TIER_LABEL = {
  signal: 'signal',
  reactive: 'reactive',
  templateDriven: 'template-driven',
  html: 'manual-html',
};

const MANUAL_SUBMIT_PENALTY = 0.2;

/** @type {import('web-codegen-scorer').Rating} */
export const formsRating = {
  kind: RatingKind.PER_BUILD,
  id: 'form-strategy',
  name: 'Form Strategy',
  description:
    'Scores which form primitive the template uses: signal forms (100%) > reactive ' +
    '(75%) > template-driven/ngModel (50%) > manual [value] binding (0%). Averaged ' +
    'across all form bindings, then penalised 20% per (submit)/(ngSubmit) handler on a ' +
    '[formRoot] form (Signal Forms submission belongs to submission.action).',
  category: RatingCategory.MEDIUM_IMPACT,
  groupingLabels: ['forms', 'angular-best-practices'],
  scoreReduction: '20%',
  rate: ({ generatedFiles }) => {
    const bundle = collectFindings(generatedFiles, /\.html$/, formStrategyConfig);
    const base = tierAverageScore(bundle, SCORE_BY_TIER, TIER_LABEL, {
      label: 'Form strategy',
      emptyFilesMessage: 'No template (.html) files.',
      emptyFindingsMessage: 'No form bindings detected in templates.',
    });

    // manualSubmit is NOT in SCORE_BY_TIER, so tierAverageScore already ignored it — apply it here.
    const manualSubmits = bundle.findings.filter((m) => m.messageId === 'manualSubmit');
    if (base.state !== RatingState.EXECUTED || manualSubmits.length === 0) return base;

    const penalty = Math.min(manualSubmits.length * MANUAL_SUBMIT_PENALTY, base.coefficient);
    const coefficient = base.coefficient - penalty;
    const notes = manualSubmits
      .map((m) => `  - ${m.filePath} (${m.line}:${m.column}): (submit)/(ngSubmit) on a [formRoot] form`)
      .join('\n');
    return {
      ...base,
      coefficient,
      message:
        `${base.message}\n  ↓ manual-submit penalty −${Math.round(penalty * 100)}% ` +
        `(${manualSubmits.length}× manualSubmit) → ${Math.round(coefficient * 100)}%\n${notes}`,
    };
  },
};
