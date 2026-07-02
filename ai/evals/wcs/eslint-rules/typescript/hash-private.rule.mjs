/**
 * hash-private — a TypeScript rule.
 *
 * House style (the INVERSE of the old no-hash-private): use ECMAScript `#private` fields/methods for
 * class member privacy, NOT the TypeScript `private` keyword. `#` privacy is real at runtime (truly
 * inaccessible, not just erased by the compiler), so we standardize on it. The two are mutually
 * exclusive ways to say the same thing — pick one, and here it's `#`.
 *
 * AST-only (typescript-eslint parser): flags any class element carrying the `private` accessibility
 * modifier. `#`-named members have no `accessibility`, so idiomatic `#field` never trips this.
 */

/** @type {import('eslint').Rule.RuleModule} */
export const hashPrivateRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Use ECMAScript `#` private fields/methods, not the TypeScript `private` keyword.',
    },
    messages: {
      hashPrivate:
        'Avoid the TypeScript `private` keyword — use an ECMAScript `#private` member instead.',
    },
    schema: [],
  },
  create(context) {
    const check = (node) => {
      if (node.accessibility === 'private') {
        context.report({ node, messageId: 'hashPrivate' });
      }
    };
    return {
      PropertyDefinition: check, // private field = ...
      MethodDefinition: check, // private method() {}
      AccessorProperty: check, // private accessor x
    };
  },
};
