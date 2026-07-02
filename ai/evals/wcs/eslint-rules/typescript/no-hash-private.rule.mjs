/**
 * no-hash-private — a TypeScript rule.
 *
 * House style for the EARLY stages: use the TypeScript `private` keyword for class member
 * visibility, NOT ECMAScript `#private` fields/methods. `private` is ubiquitous in training data
 * (so a plain instruction lands) AND it is readable from Angular templates — `#private` members are
 * a hard template parse error. The modern `#private` opinion is deferred to a later, example-driven
 * stage (see hash-private.rule.mjs). AST-only: flags any `#`-prefixed PrivateIdentifier member.
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noHashPrivateRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Use the `private` keyword, not ECMAScript `#` private fields/methods.',
    },
    messages: {
      noHashPrivate:
        'Avoid the ECMAScript `#{{name}}` private member — use the TypeScript `private` keyword instead.',
    },
    schema: [],
  },
  create(context) {
    const check = (node) => {
      if (node.key?.type === 'PrivateIdentifier') {
        context.report({
          node: node.key,
          messageId: 'noHashPrivate',
          data: { name: node.key.name },
        });
      }
    };
    return {
      PropertyDefinition: check, // #field = ...
      MethodDefinition: check, // #method() {}
      AccessorProperty: check, // accessor #x
    };
  },
};
