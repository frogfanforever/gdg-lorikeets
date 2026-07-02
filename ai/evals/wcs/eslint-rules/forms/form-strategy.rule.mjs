import { getTemplateParserServices } from '@angular-eslint/utils';

/**
 * form-strategy — an Angular TEMPLATE rule (runs on the compiler's template AST).
 *
 * Classifies every form binding in a template into ONE tier and reports it with a
 * matching `messageId`. Detection only — it does NOT decide what a tier is worth;
 * the eval (env/ratings/forms.rating.mjs) maps messageId → score.
 *
 *   [formField]                              → 'signal'         (@angular/forms/signals)
 *   [formControl]/[formGroup]/[formArray]    → 'reactive'
 *   formControlName/formGroupName/...Name     → 'reactive'
 *   [(ngModel)] / ngModelGroup               → 'templateDriven'
 *   [value] on input/textarea/select         → 'html'           (manual, no form primitive)
 *
 * It ALSO flags a submission antipattern: a `(submit)` / `(ngSubmit)` handler on a
 * `[formRoot]` form → 'manualSubmit'. With Signal Forms, `[formRoot]` OWNS submission
 * (via the `submission.action` option); a manual submit handler is the thing a model
 * falls back to WITHOUT the forms guidance. The eval treats it as a penalty, not a tier.
 *
 * Confirmed against https://angular.dev/essentials/signal-forms (Angular 22). Uses the
 * `Element` visitor: `.inputs` are `[x]` bound attrs, `.attributes` are plain `x="..."`,
 * `.outputs` are `(x)` event bindings.
 */

const SIGNAL = new Set(['formField']);
const REACTIVE = new Set([
  'formControl', 'formGroup', 'formArray', // property bindings [formControl]
  'formControlName', 'formGroupName', 'formArrayName', // plain attributes
]);
const TEMPLATE_DRIVEN = new Set(['ngModel', 'ngModelGroup']);
const FORM_ELEMENTS = new Set(['input', 'textarea', 'select']);
const FORM_ROOT = 'formRoot';
const MANUAL_SUBMIT_EVENTS = new Set(['submit', 'ngSubmit']);

/** Map an attribute/binding name (+ owning element tag) to a tier messageId, or null. */
export function classify(name, elementName) {
  if (SIGNAL.has(name)) return 'signal';
  if (REACTIVE.has(name)) return 'reactive';
  if (TEMPLATE_DRIVEN.has(name)) return 'templateDriven';
  if (name === 'value' && FORM_ELEMENTS.has(elementName)) return 'html';
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export const formStrategyRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Classifies the form-binding strategy used in the template.' },
    // Each message IS a tier; the rating maps messageId → score.
    messages: {
      signal: 'Signal forms — [formField] (@angular/forms/signals).',
      reactive: 'Reactive forms — [formControl]/[formGroup]/formControlName.',
      templateDriven: 'Template-driven form — [(ngModel)]/ngModelGroup.',
      html: 'Manual [value] binding with no form primitive.',
      manualSubmit:
        'Manual (submit)/(ngSubmit) handler on a [formRoot] form — Signal Forms submission ' +
        'belongs to the submission.action option, not a template event handler.',
    },
    schema: [],
  },
  create(context) {
    const parserServices = getTemplateParserServices(context);
    const report = (node, messageId) =>
      context.report({
        loc: parserServices.convertNodeSourceSpanToLoc(node.sourceSpan),
        messageId,
      });
    return {
      Element(node) {
        const el = node.name;
        // inputs = [x] / [(x)] bound attributes; attributes = plain x="..."
        for (const attr of [...node.inputs, ...node.attributes]) {
          const tier = classify(attr.name, el);
          if (tier) report(attr, tier);
        }
        // Signal-form submission antipattern: a (submit)/(ngSubmit) handler on a [formRoot] form.
        // outputs = (x) event bindings. Gate on [formRoot] so a legit reactive-form (ngSubmit) is untouched.
        if (el === 'form') {
          const hasFormRoot =
            node.inputs.some((i) => i.name === FORM_ROOT) ||
            node.attributes.some((a) => a.name === FORM_ROOT);
          if (hasFormRoot) {
            for (const out of node.outputs) {
              if (MANUAL_SUBMIT_EVENTS.has(out.name)) report(out, 'manualSubmit');
            }
          }
        }
      },
    };
  },
};
