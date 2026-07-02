/**
 * model-declaration-kind — a TypeScript rule (scoped to `*.model.ts`).
 *
 * Opinionated data-modeling tier: prefer a `type` alias, then an `interface`, then a `class`.
 * Emits one finding per top-level model declaration tagged with its kind (messageId); the
 * rating maps kind → score (typeAlias 1.0 > interface 0.8 > class 0.5) and averages.
 */

/** True if a declaration sits at module top level (directly or via `export`). */
function isTopLevel(node) {
  const p = node.parent;
  if (!p) return false;
  if (p.type === 'Program') return true;
  return (
    (p.type === 'ExportNamedDeclaration' || p.type === 'ExportDefaultDeclaration') &&
    p.parent?.type === 'Program'
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export const modelDeclarationKindRule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Prefer type aliases over interfaces over classes for data models.' },
    messages: {
      typeAlias: 'Model declared as a `type` alias — preferred.',
      interface: 'Model declared as an `interface` — prefer a `type` alias.',
      class: 'Model declared as a `class` — prefer a `type` alias (or `interface`).',
    },
    schema: [],
  },
  create(context) {
    return {
      TSTypeAliasDeclaration(node) {
        if (isTopLevel(node)) context.report({ node: node.id, messageId: 'typeAlias' });
      },
      TSInterfaceDeclaration(node) {
        if (isTopLevel(node)) context.report({ node: node.id, messageId: 'interface' });
      },
      ClassDeclaration(node) {
        if (isTopLevel(node)) context.report({ node: node.id ?? node, messageId: 'class' });
      },
    };
  },
};
