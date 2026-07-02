/**
 * service-decorator-strategy — a TypeScript rule. Detection only.
 *
 * Classifies how every service is declared into scoring tiers, reporting each with a matching
 * `messageId`. It does NOT decide what a tier is worth; the eval maps messageId → score:
 *   - env/ratings/service-decorator.rating.mjs
 *
 * The opinion (this project's house convention): we ship a custom `@Service` decorator that
 * bakes in `providedIn: 'root'`, so reaching for raw `@Injectable` is a smell — the more
 * scope you have to spell out by hand, the worse:
 *   @Service / @Service()                         → 'serviceDecorator'  (best — house decorator)
 *   @Injectable({ providedIn: 'root' })           → 'injectableRoot'    (acceptable)
 *   @Injectable({ providedIn: 'platform'|'any'… }) → 'injectableScoped'  (narrow scope)
 *   @Injectable() / @Injectable({}) (no providedIn)→ 'injectableEmpty'   (not tree-shakable — avoid)
 *
 * Each service decorator yields exactly ONE finding. AST-only (visits `Decorator` nodes) so it
 * runs under the synchronous Linter — no type info. `@Service` is an out-of-weights API the model
 * has never seen; the stage-4 prompt SHOWS it by example.
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

/** Is this decorator expression a reference to `name`, called (`@name()`) or bare (`@name`)? */
function isDecoratorNamed(expr, name) {
  if (expr?.type === 'Identifier') return { match: expr.name === name, call: null };
  if (expr?.type === 'CallExpression' && expr.callee?.type === 'Identifier') {
    return { match: expr.callee.name === name, call: expr };
  }
  return { match: false, call: null };
}

/** @type {import('eslint').Rule.RuleModule} */
export const serviceDecoratorStrategyRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Classifies how a service is declared (@Service vs @Injectable + providedIn) into scoring tiers.',
    },
    // Each message IS a tier; the rating maps messageId → score.
    messages: {
      serviceDecorator: '`@Service` — the house decorator (preferred).',
      injectableRoot: "`@Injectable({ providedIn: 'root' })` — acceptable; prefer `@Service`.",
      injectableScoped:
        "`@Injectable({ providedIn: 'platform' | 'any' | … })` — narrow scope; prefer `@Service`.",
      injectableEmpty: '`@Injectable()` with no `providedIn` — not tree-shakable; strictly avoid.',
    },
    schema: [],
  },
  create(context) {
    return {
      Decorator(node) {
        const e = node.expression;

        // ── @Service / @Service() ── the house decorator (best) ──
        if (isDecoratorNamed(e, 'Service').match) {
          context.report({ node, messageId: 'serviceDecorator' });
          return;
        }

        // ── @Injectable(...) / @Injectable ──
        const injectable = isDecoratorNamed(e, 'Injectable');
        if (!injectable.match) return;

        const arg = injectable.call?.arguments?.[0];
        const obj = arg?.type === 'ObjectExpression' ? arg : null;
        const providedIn = findProp(obj, 'providedIn');
        if (!providedIn) {
          context.report({ node, messageId: 'injectableEmpty' });
          return;
        }
        const v = providedIn.value;
        const isRoot = v?.type === 'Literal' && v.value === 'root';
        context.report({ node: providedIn, messageId: isRoot ? 'injectableRoot' : 'injectableScoped' });
      },
    };
  },
};
