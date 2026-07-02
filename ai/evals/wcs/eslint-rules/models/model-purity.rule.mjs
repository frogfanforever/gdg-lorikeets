/**
 * model-purity — a TypeScript rule (scoped to `*.model.ts`).
 *
 * Models are pure, immutable data: every property must be `readonly`, and there must be no
 * behavior (no methods, getters, or setters). Flags each violation. Works across all three
 * model forms — `type` alias object members, `interface` members, and `class` members.
 */

function nameOf(key) {
  if (!key) return '?';
  return key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : '?';
}

/** @type {import('eslint').Rule.RuleModule} */
export const modelPurityRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Model properties must be readonly; models must have no methods/getters/setters.',
    },
    messages: {
      mutable: 'Model property `{{name}}` must be `readonly`.',
      behavior: 'Models must be pure data — remove the {{kind}} `{{name}}`.',
    },
    schema: [],
  },
  create(context) {
    return {
      // interface / type-literal members
      TSPropertySignature(node) {
        if (!node.readonly) context.report({ node, messageId: 'mutable', data: { name: nameOf(node.key) } });
      },
      TSMethodSignature(node) {
        const kind = node.kind === 'get' ? 'getter' : node.kind === 'set' ? 'setter' : 'method';
        context.report({ node, messageId: 'behavior', data: { kind, name: nameOf(node.key) } });
      },
      // class members
      PropertyDefinition(node) {
        if (!node.readonly) context.report({ node, messageId: 'mutable', data: { name: nameOf(node.key) } });
      },
      MethodDefinition(node) {
        if (node.kind === 'constructor') return;
        const kind = node.kind === 'get' ? 'getter' : node.kind === 'set' ? 'setter' : 'method';
        context.report({ node, messageId: 'behavior', data: { kind, name: nameOf(node.key) } });
      },
    };
  },
};
