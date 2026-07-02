/**
 * no-decorator-inputs-outputs — a TypeScript rule. (Ports lowgular `input-output`.)
 *
 * Use the signal-based `input()` / `output()` / `viewChild()` … functions, NOT the legacy
 * `@Input()` / `@Output()` / `@ViewChild()` … decorators. Flags each such decorator.
 * AST-only (visits `Decorator` nodes) so it runs under the synchronous Linter.
 */

// decorator name -> the function that replaces it
const DECORATOR_TO_FN = {
  Input: 'input',
  Output: 'output',
  ViewChild: 'viewChild',
  ViewChildren: 'viewChildren',
  ContentChild: 'contentChild',
  ContentChildren: 'contentChildren',
};

/** @type {import('eslint').Rule.RuleModule} */
export const noDecoratorInputsOutputsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Use the input()/output()/viewChild() functions instead of the @Input()/@Output()/@ViewChild() decorators.',
    },
    messages: {
      useFunction: 'Use the `{{fn}}()` function instead of the `@{{name}}()` decorator.',
    },
    schema: [],
  },
  create(context) {
    return {
      Decorator(node) {
        const e = node.expression;
        // `@Input` (Identifier) or `@Input()` (CallExpression)
        const id = e?.type === 'CallExpression' ? e.callee : e;
        if (id?.type === 'Identifier' && DECORATOR_TO_FN[id.name]) {
          context.report({
            node,
            messageId: 'useFunction',
            data: { name: id.name, fn: DECORATOR_TO_FN[id.name] },
          });
        }
      },
    };
  },
};
