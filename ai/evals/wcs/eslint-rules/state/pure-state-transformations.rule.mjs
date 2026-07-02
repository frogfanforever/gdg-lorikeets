/**
 * pure-state-transformations — a TypeScript rule. (Ports lowgular `pure-state-transformations`.)
 *
 * Keep `computed()` and signal `.update()` callbacks PURE: they must derive a value, not mutate
 * component state. Flags `this.<x> = ...` assignments inside a `computed(...)` or `.update(...)`
 * callback. (Simplified from the lowgular version, which also counted standalone function-call
 * statements; the `this.x =` assignment is the clearest impurity.) AST-only.
 */

/** Name of the call whose argument callback directly encloses `node`, if it's computed/update. */
function enclosingPureCallback(node) {
  for (let a = node.parent; a; a = a.parent) {
    if (a.type === 'ArrowFunctionExpression' || a.type === 'FunctionExpression') {
      const call = a.parent;
      if (call?.type === 'CallExpression' && call.arguments.includes(a)) {
        const callee = call.callee;
        const name =
          callee?.type === 'Identifier'
            ? callee.name
            : callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier'
              ? callee.property.name
              : null;
        if (name === 'computed' || name === 'update') return name;
      }
      return null; // stop at the first enclosing function boundary
    }
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export const pureStateTransformationsRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Inside computed() and update() callbacks, keep transformations pure: no this.<x> = ... assignments.',
    },
    messages: {
      impure:
        'Do not assign to `this.{{prop}}` inside a {{ctx}}() callback — keep derivations pure (return the value).',
    },
    schema: [],
  },
  create(context) {
    return {
      AssignmentExpression(node) {
        const left = node.left;
        if (left?.type !== 'MemberExpression' || left.object?.type !== 'ThisExpression') return;
        const ctx = enclosingPureCallback(node);
        if (!ctx) return;
        const prop = left.property?.type === 'Identifier' ? left.property.name : '?';
        context.report({ node, messageId: 'impure', data: { prop, ctx } });
      },
    };
  },
};
