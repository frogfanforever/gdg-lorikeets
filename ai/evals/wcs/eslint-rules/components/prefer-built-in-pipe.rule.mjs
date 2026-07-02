/**
 * prefer-built-in-pipe — a TypeScript rule.
 *
 * Flags manual date/number/currency/case formatting (toFixed, toLocaleDateString,
 * toUpperCase, ...) called inside a class decorated with @Component — "a method that
 * looks like a built-in pipe". That formatting belongs in a template pipe (DatePipe,
 * CurrencyPipe, DecimalPipe, Upper/LowerCasePipe). AST-only so it runs under the
 * synchronous Linter.
 */

// formatting method -> the built-in pipe it should be.
const FORMATTING_METHODS = {
  toFixed: 'DecimalPipe / CurrencyPipe',
  toPrecision: 'DecimalPipe',
  toExponential: 'DecimalPipe',
  toLocaleString: 'DatePipe / CurrencyPipe / DecimalPipe',
  toLocaleDateString: 'DatePipe',
  toLocaleTimeString: 'DatePipe',
  toISOString: 'DatePipe',
  toDateString: 'DatePipe',
  toTimeString: 'DatePipe',
  toUpperCase: 'UpperCasePipe',
  toLowerCase: 'LowerCasePipe',
};

/** Walk ancestors; true if the nearest enclosing class is decorated with @Component. */
function inComponentClass(node) {
  for (let a = node.parent; a; a = a.parent) {
    if (a.type === 'ClassDeclaration' || a.type === 'ClassExpression') {
      const decorators = a.decorators ?? [];
      return decorators.some((d) => {
        const e = d.expression;
        return (
          e?.type === 'CallExpression' &&
          e.callee?.type === 'Identifier' &&
          e.callee.name === 'Component'
        );
      });
    }
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
export const preferBuiltInPipeRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Do manual date/number/currency/case formatting with Angular built-in pipes in the template, not with formatting methods inside a component class.',
    },
    messages: {
      pipe: 'Formatting method `.{{method}}()` in a component looks like a {{pipe}} — format in the template with the built-in pipe instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee?.type !== 'MemberExpression' ||
          callee.property?.type !== 'Identifier'
        ) {
          return;
        }
        const method = callee.property.name;
        const pipe = FORMATTING_METHODS[method];
        if (!pipe) return;
        if (!inComponentClass(node)) return;
        context.report({
          node: callee.property,
          messageId: 'pipe',
          data: { method, pipe },
        });
      },
    };
  },
};
