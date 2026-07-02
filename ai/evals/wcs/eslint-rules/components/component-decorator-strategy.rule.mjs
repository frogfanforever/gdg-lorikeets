/**
 * component-decorator-strategy — a TypeScript rule. Detection only.
 *
 * Classifies the change-detection strategy AND the standalone declaration of every
 * `@Component` decorator into tiers, reporting each with a matching `messageId`. It does
 * NOT decide what a tier is worth; the evals map messageId → score:
 *   - env/ratings/change-detection.rating.mjs  (the cd* tiers)
 *   - env/ratings/standalone.rating.mjs         (the standalone* tiers)
 *
 * The opinion (modern Angular: the good behaviour is the implicit default, so DECLARING it
 * is redundant boilerplate and OPTING OUT is wrong):
 *   changeDetection absent                            → 'changeDetectionAbsent'  (best)
 *   changeDetection: ChangeDetectionStrategy.OnPush   → 'changeDetectionOnPush'  (boilerplate)
 *   changeDetection: …Default (or anything else)      → 'changeDetectionDefault' (opts into zone CD)
 *   standalone absent                                 → 'standaloneAbsent'       (best)
 *   standalone: true                                  → 'standaloneTrue'         (redundant — it's the default)
 *   standalone: false                                 → 'standaloneFalse'        (NgModule-based)
 *
 * Every `@Component` therefore yields exactly TWO findings (one cd tier + one standalone tier).
 * AST-only (visits `Decorator` nodes) so it runs under the synchronous Linter — no type info.
 */

/** Find a non-computed object property by key name (Identifier or string Literal). */
function findProp(objExpr, name) {
  if (!objExpr || objExpr.type !== 'ObjectExpression') return undefined;
  return objExpr.properties.find(
    (p) =>
      p.type === 'Property' &&
      !p.computed &&
      ((p.key.type === 'Identifier' && p.key.name === name) ||
        (p.key.type === 'Literal' && p.key.value === name)),
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export const componentDecoratorStrategyRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Classifies the @Component changeDetection strategy and standalone declaration into scoring tiers.',
    },
    // Each message IS a tier; the ratings map messageId → score.
    messages: {
      changeDetectionAbsent: 'No `changeDetection` key — implicit change detection (preferred).',
      changeDetectionOnPush: '`changeDetection: OnPush` — explicit; redundant boilerplate.',
      changeDetectionDefault: '`changeDetection: Default` — opts into zone-based change detection.',
      standaloneAbsent: 'No `standalone` key — implicitly standalone (preferred).',
      standaloneTrue: '`standalone: true` — redundant; standalone is the default.',
      standaloneFalse: '`standalone: false` — NgModule-based component.',
    },
    schema: [],
  },
  create(context) {
    return {
      Decorator(node) {
        const e = node.expression;
        // Only `@Component({...})` (a CallExpression with callee Identifier `Component`).
        if (e?.type !== 'CallExpression' || e.callee?.type !== 'Identifier' || e.callee.name !== 'Component') {
          return;
        }
        const arg = e.arguments?.[0];
        const obj = arg?.type === 'ObjectExpression' ? arg : null;

        // ── changeDetection ──
        const cd = obj && findProp(obj, 'changeDetection');
        if (!cd) {
          context.report({ node, messageId: 'changeDetectionAbsent' });
        } else {
          const v = cd.value;
          const isOnPush =
            v?.type === 'MemberExpression' && v.property?.type === 'Identifier' && v.property.name === 'OnPush';
          context.report({ node: cd, messageId: isOnPush ? 'changeDetectionOnPush' : 'changeDetectionDefault' });
        }

        // ── standalone ──
        const sa = obj && findProp(obj, 'standalone');
        if (!sa) {
          context.report({ node, messageId: 'standaloneAbsent' });
        } else {
          const isFalse = sa.value?.type === 'Literal' && sa.value.value === false;
          context.report({ node: sa, messageId: isFalse ? 'standaloneFalse' : 'standaloneTrue' });
        }
      },
    };
  },
};
