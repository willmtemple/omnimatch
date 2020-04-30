import { match } from "../src";

type Expression = SExpression | Atom;

type Atom = number | string;

type SExpression = Add | Sub | Mul | Div | Let;

type Add = ["+", ...Expression[]];
type Sub = ["-", Expression, ...Expression[]];
type Mul = ["*", ...Expression[]];
type Div = ["/", Expression, Expression];
type Let = ["let", [string, Expression], Expression];

function evaluate(x: Expression, env: { [k: string]: number } = {}): number {
  if (typeof x === "number") {
    return x;
  } else if (typeof x === "string") {
    // Lookup name
    if (env[x] !== undefined) {
      return env[x];
    } else throw new Error("No such binding for " + x);
  } else {
    // boundEval: evaluate in the scope of env, useful for map/reduce
    const boundEval = (e: Expression) => evaluate(e, env);
    // Core use of match here: take note of the discriminator
    return match(
      x,
      {
        "+": ([_, ...args]: Add) => args.map(boundEval).reduce((l, r) => l + r),
        "*": ([_, ...args]: Mul) => args.map(boundEval).reduce((l, r) => l * r),
        "-": ([_, left, ...right]: Sub) => {
          // Support a unary -
          if (right.length <= 0) {
            return -boundEval(left);
          } else {
            return (
              boundEval(left) - right.map(boundEval).reduce((l, r) => l + r)
            );
          }
        },
        "/": ([_, left, right]: Div) => boundEval(left) / boundEval(right),
        // eval body in the env, after extending it with the new name
        let: ([_, [name, value], body]: Let) =>
          evaluate(body, { ...env, [name]: boundEval(value) }),
      },
      0
    ); // 0 as discriminator is read "first item of the tuple"
  }
}

test("match AB union", () => {
  const sexpr: SExpression = ["let", ["x", ["+", 100, 31]], ["/", "x", 15]];
  expect(evaluate(sexpr)).toBeCloseTo(8.733);
});
