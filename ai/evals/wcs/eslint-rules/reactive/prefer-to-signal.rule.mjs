/**
 * prefer-to-signal — a TypeScript rule.
 *
 * Flags `this.<x>.set(...)` / `this.<x>.update(...)` inside a `.subscribe()` block ONLY WHEN the
 * value being set derives from the subscribe callback's parameter — i.e. you're piping a stream's
 * values into a signal by hand. THAT is the pattern that should be `toSignal()`: it leaks the
 * subscription and reimplements reactivity.
 *
 * A one-shot action that sets a constant/flag on completion — `login().subscribe(() => this.done.set(true))`
 * — is deliberately NOT flagged: `toSignal()` is the wrong tool for a submit handler, and a plain
 * `.set()` there is idiomatic. AST-only (no type info) so it runs under the synchronous Linter.
 */

/** Collect every identifier name bound by a function's parameters (handles destructuring). */
function paramNames(fn) {
  const names = new Set();
  const collect = (p) => {
    if (!p) return;
    switch (p.type) {
      case 'Identifier': names.add(p.name); break;
      case 'ObjectPattern': p.properties.forEach((pr) => collect(pr.value ?? pr.argument)); break;
      case 'ArrayPattern': p.elements.forEach(collect); break;
      case 'AssignmentPattern': collect(p.left); break;
      case 'RestElement': collect(p.argument); break;
    }
  };
  fn.params?.forEach(collect);
  return names;
}

/** The handler function passed to `.subscribe(...)` — either a bare fn or the `next` of an observer. */
function subscribeHandler(subscribeCall) {
  const arg = subscribeCall.arguments?.[0];
  if (!arg) return null;
  if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') return arg;
  if (arg.type === 'ObjectExpression') {
    const next = arg.properties.find(
      (p) => p.type === 'Property' && p.key?.type === 'Identifier' && p.key.name === 'next',
    );
    const v = next?.value;
    return v && (v.type === 'ArrowFunctionExpression' || v.type === 'FunctionExpression') ? v : null;
  }
  return null;
}

/** Does any node in `root` reference one of `names`? */
function referencesAny(root, names) {
  let found = false;
  const walk = (n) => {
    if (found || !n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier' && names.has(n.name)) { found = true; return; }
    for (const k of Object.keys(n)) {
      if (k === 'parent') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v.type === 'string') walk(v);
    }
  };
  walk(root);
  return found;
}

/** @type {import('eslint').Rule.RuleModule} */
export const preferToSignalRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Convert observables to signals with toSignal() instead of piping stream values into a signal via subscribe + set.',
    },
    messages: {
      toSignal:
        "Prefer toSignal() over piping a stream's values into a signal by hand — this subscribe+set leaks the subscription and misses reactivity. (A one-shot .set() of a constant on completion is fine.)",
    },
    schema: [],
  },
  create(context) {
    return {
      'CallExpression[callee.type="MemberExpression"][callee.property.name=/^(set|update)$/]'(node) {
        const obj = node.callee.object;
        // restrict to `this.<x>.set(...)` to avoid Map.set / form.set noise
        if (obj?.type !== 'MemberExpression' || obj.object?.type !== 'ThisExpression') return;

        for (let a = node.parent; a; a = a.parent) {
          if (
            a.type === 'CallExpression' &&
            a.callee?.type === 'MemberExpression' &&
            a.callee.property?.type === 'Identifier' &&
            a.callee.property.name === 'subscribe'
          ) {
            const handler = subscribeHandler(a);
            const streamParams = handler ? paramNames(handler) : new Set();
            // Flag ONLY when the set/update value derives from the stream (the subscribe param).
            if (streamParams.size && node.arguments.some((arg) => referencesAny(arg, streamParams))) {
              context.report({ node, messageId: 'toSignal' });
            }
            return;
          }
        }
      },
    };
  },
};
