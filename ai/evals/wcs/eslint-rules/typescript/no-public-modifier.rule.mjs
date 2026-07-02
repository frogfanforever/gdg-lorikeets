/**
 * no-public-modifier — a TypeScript rule. Flags the redundant `public` access modifier
 * (it's the default). Members are private by default; use `protected` only for template-used
 * members. AST-only.
 */
/** @type {import('eslint').Rule.RuleModule} */
export const noPublicModifierRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Do not use the redundant `public` access modifier.' },
    messages: { noPublic: 'Remove the redundant `public` modifier — it is the default.' },
    schema: [],
  },
  create(context) {
    const check = (node) => {
      if (node.accessibility === 'public') context.report({ node, messageId: 'noPublic' });
    };
    return {
      PropertyDefinition: check,
      MethodDefinition: check,
      TSParameterProperty: check,
    };
  },
};
