/**
 * require-subscription-teardown — a TypeScript rule.
 *
 * Every `.subscribe()` must be torn down: the observable it's called on must `.pipe()`
 * through a teardown operator (take/takeUntil/takeUntilDestroyed/first), otherwise the
 * subscription leaks. AST-only (no type info) so it runs under the synchronous Linter.
 */

const TEARDOWN_OPERATORS = new Set([
  'take',
  'takeUntil',
  'takeUntilDestroyed',
  'first', // equivalent to take(1)
]);

/** True if `node` is a `.pipe(...)` CallExpression whose args include a teardown operator. */
function isPipeWithTeardown(node) {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (
    callee?.type !== 'MemberExpression' ||
    callee.property?.type !== 'Identifier' ||
    callee.property.name !== 'pipe'
  ) {
    return false;
  }
  return node.arguments.some(
    (arg) =>
      arg.type === 'CallExpression' &&
      arg.callee?.type === 'Identifier' &&
      TEARDOWN_OPERATORS.has(arg.callee.name),
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export const requireSubscriptionTeardownRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Observables must be torn down: pipe through take/takeUntil/takeUntilDestroyed (or use the async pipe) instead of a bare .subscribe().',
    },
    messages: {
      teardown:
        'Subscription is not torn down. Add take()/takeUntil()/takeUntilDestroyed() to the .pipe(), or prefer the async pipe / toSignal().',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee?.type !== 'MemberExpression' ||
          callee.property?.type !== 'Identifier' ||
          callee.property.name !== 'subscribe'
        ) {
          return;
        }
        if (!isPipeWithTeardown(callee.object)) {
          context.report({ node: callee.property, messageId: 'teardown' });
        }
      },
    };
  },
};
