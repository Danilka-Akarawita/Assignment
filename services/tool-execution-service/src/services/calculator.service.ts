import {
  create,
  all,
  type FunctionNode,
  type MathNode,
  type OperatorNode,
  type ParenthesisNode,
  type SymbolNode,
} from 'mathjs';

const math = create(all!, {});

const ALLOWED_FUNCTIONS = new Set([
  'abs',
  'acos',
  'acosh',
  'asin',
  'asinh',
  'atan',
  'atan2',
  'atanh',
  'cbrt',
  'ceil',
  'cos',
  'cosh',
  'exp',
  'floor',
  'log',
  'log10',
  'log2',
  'max',
  'min',
  'mod',
  'pow',
  'round',
  'sign',
  'sin',
  'sinh',
  'sqrt',
  'tan',
  'tanh',
  'sum',
  'mean',
  'median',
  'std',
  'variance',
]);

export class CalculatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculatorError';
  }
}

function assertSafeAst(node: MathNode): void {
  switch (node.type) {
    case 'ConstantNode':
      return;
    case 'OperatorNode':
      (node as OperatorNode).args.forEach(assertSafeAst);
      return;
    case 'ParenthesisNode':
      assertSafeAst((node as ParenthesisNode).content);
      return;
    case 'FunctionNode': {
      const fnNode = node as FunctionNode;
      if (fnNode.fn.type !== 'SymbolNode') {
        throw new CalculatorError('Invalid function reference');
      }
      const name = (fnNode.fn as SymbolNode).name;
      if (!ALLOWED_FUNCTIONS.has(name)) {
        throw new CalculatorError(`Function not allowed: ${name}`);
      }
      fnNode.args.forEach(assertSafeAst);
      return;
    }
    case 'SymbolNode': {
      const sym = node as SymbolNode;
      if (!['pi', 'e', 'tau'].includes(sym.name)) {
        throw new CalculatorError(`Symbol not allowed: ${sym.name}`);
      }
      return;
    }
    default:
      throw new CalculatorError(`Unsupported expression element: ${node.type}`);
  }
}

export class CalculatorService {
  evaluate(expression: string): { expression: string; result: number } {
    const trimmed = expression.trim();
    if (!trimmed) {
      throw new CalculatorError('Expression is empty');
    }

    const node = math.parse(trimmed);
    assertSafeAst(node);

    const evaluated = node.evaluate();
    if (typeof evaluated !== 'number' || !Number.isFinite(evaluated)) {
      throw new CalculatorError('Expression did not evaluate to a finite number');
    }

    return { expression: trimmed, result: evaluated };
  }
}
