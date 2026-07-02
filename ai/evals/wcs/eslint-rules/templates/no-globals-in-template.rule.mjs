import { getTemplateParserServices } from '@angular-eslint/utils';

/**
 * no-globals-in-template — an Angular TEMPLATE rule. (Ports lowgular `no-globals-in-templates`.)
 *
 * Templates must not assume JS globals (`new Date()`, `Math`, `window`, `document`, …) are in
 * scope — Angular evaluates expressions against the component, not the global object. Flags a
 * binding/interpolation/event expression that references one of these globals. Detection is a
 * token scan of the expression source (simplified from walking the binding AST).
 */

const GLOBALS = [
  'Date', 'Math', 'window', 'document', 'JSON', 'console',
  'localStorage', 'sessionStorage', 'navigator', 'globalThis',
];
const GLOBAL_RE = new RegExp(`\\b(${GLOBALS.join('|')})\\b`);

/** Best-effort extraction of an expression's raw source from a template node. */
function exprSource(node) {
  return node?.value?.source ?? node?.handler?.source ?? null;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noGlobalsInTemplateRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Do not reference JS globals (new Date(), Math, window, document, …) in templates.',
    },
    messages: {
      noGlobal: 'Template expression references the global `{{name}}` — compute it in the component instead.',
    },
    schema: [],
  },
  create(context) {
    const parserServices = getTemplateParserServices(context);
    const check = (node) => {
      const src = exprSource(node);
      if (!src) return;
      const m = GLOBAL_RE.exec(src);
      if (m) {
        context.report({
          loc: parserServices.convertNodeSourceSpanToLoc(node.sourceSpan),
          messageId: 'noGlobal',
          data: { name: m[1] },
        });
      }
    };
    return {
      BoundText: check,      // {{ ... }} interpolation
      BoundAttribute: check, // [prop]="..."
      BoundEvent: check,     // (event)="..."
    };
  },
};
