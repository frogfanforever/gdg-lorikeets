/**
 * no-activated-route-snapshot — a TypeScript rule.
 *
 * `ActivatedRoute.snapshot` reads route state ONCE and does not react to later navigation, so
 * params/queryParams go stale when the component is reused across routes. Use the reactive
 * members instead (`route.paramMap` / `route.params` / `route.queryParamMap`, piped or via
 * `toSignal`). Flags `.snapshot` access on anything bound to `ActivatedRoute`.
 *
 * AST-only (no type info): identifies `ActivatedRoute` references by `inject(ActivatedRoute)`
 * or a `: ActivatedRoute` annotation, then matches `.snapshot` against those. Two passes
 * (collect on traverse, report on `Program:exit`) so usage-before-declaration still resolves.
 */

function isInjectActivatedRoute(init) {
  return (
    init?.type === 'CallExpression' &&
    init.callee?.type === 'Identifier' &&
    init.callee.name === 'inject' &&
    init.arguments?.[0]?.type === 'Identifier' &&
    init.arguments[0].name === 'ActivatedRoute'
  );
}

function isActivatedRouteType(typeAnnotation) {
  const t = typeAnnotation?.typeAnnotation;
  return (
    t?.type === 'TSTypeReference' &&
    t.typeName?.type === 'Identifier' &&
    t.typeName.name === 'ActivatedRoute'
  );
}

/** Normalize `route` (Identifier) and `this.route` (MemberExpression) to the binding name. */
function bindingName(objNode) {
  if (objNode?.type === 'Identifier') return objNode.name;
  if (
    objNode?.type === 'MemberExpression' &&
    objNode.object?.type === 'ThisExpression' &&
    !objNode.computed &&
    objNode.property?.type === 'Identifier'
  ) {
    return objNode.property.name;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noActivatedRouteSnapshotRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Do not use ActivatedRoute.snapshot — use the reactive paramMap/params/queryParamMap instead.',
    },
    messages: {
      noSnapshot:
        'Avoid `ActivatedRoute.snapshot` — it does not react to navigation. Use `route.paramMap`/`route.params`/`route.queryParamMap` (piped or via toSignal) instead.',
    },
    schema: [],
  },
  create(context) {
    const routeNames = new Set();
    const accesses = []; // { node, name }

    const trackKey = (key, value, typeAnnotation) => {
      if (key?.type === 'Identifier' && (isInjectActivatedRoute(value) || isActivatedRouteType(typeAnnotation))) {
        routeNames.add(key.name);
      }
    };

    return {
      // route = inject(ActivatedRoute)  |  route!: ActivatedRoute
      PropertyDefinition(node) {
        trackKey(node.key, node.value, node.typeAnnotation);
      },
      // const route = inject(ActivatedRoute)  |  const route: ActivatedRoute = ...
      VariableDeclarator(node) {
        if (node.id?.type === 'Identifier') {
          trackKey(node.id, node.init, node.id.typeAnnotation);
        }
      },
      // constructor(private route: ActivatedRoute)
      Identifier(node) {
        if (node.typeAnnotation && isActivatedRouteType(node.typeAnnotation)) {
          routeNames.add(node.name);
        }
      },
      // collect every `.snapshot` access + flag inline inject(ActivatedRoute).snapshot now
      MemberExpression(node) {
        if (node.computed || node.property?.type !== 'Identifier' || node.property.name !== 'snapshot') {
          return;
        }
        if (isInjectActivatedRoute(node.object)) {
          context.report({ node: node.property, messageId: 'noSnapshot' });
          return;
        }
        const name = bindingName(node.object);
        if (name) accesses.push({ node: node.property, name });
      },
      'Program:exit'() {
        for (const { node, name } of accesses) {
          if (routeNames.has(name)) context.report({ node, messageId: 'noSnapshot' });
        }
      },
    };
  },
};
