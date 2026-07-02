/**
 * no-mutate-on-signals — a TypeScript rule. (Ports lowgular `no-mutate-on-signals`.)
 *
 * Writable signals expose `set()` / `update()`, never `mutate()` (it was removed from
 * Angular). Flags any `.mutate(...)` call. The lowgular version was type-aware (restricted
 * to `WritableSignal<...>` receivers); simplified here to any `.mutate(` call — `mutate` is
 * effectively signal-only, so false positives are rare. AST-only.
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noMutateOnSignalsRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'For writable signals use set()/update() to change values, never mutate().',
    },
    messages: {
      noMutate: 'Do not use `.mutate()` on a signal — use `.set()` or `.update()` instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee?.type === 'MemberExpression' &&
          callee.property?.type === 'Identifier' &&
          callee.property.name === 'mutate'
        ) {
          context.report({ node: callee.property, messageId: 'noMutate' });
        }
      },
    };
  },
};
