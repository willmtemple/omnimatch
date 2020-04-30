# Omnimatch

TypeScript tagged-union utility-knife

```typescript
const result = match(expresion, {
  Number: ({ value }) => value,
  Add: ({ addends }) => addends.map(evaluate).reduce((l, r) => l + r),
  Subtract: ({ left, right }) => evaluate(left) - evaluate(right),
  Multiply: ({ multiplicands }) => multiplicands.map(evaluate).reduce((l, r) => l * r),
  Divide: ({ dividend, divisor }) => evaluate(dividend) / evaluate(divisor)
});
```

__⚠️ Warning__: This package is in development and has not been thoroughly
tested. It may cause:

- bizarre type errors
- long compilation times

You __should not__ use this package without a type-checker. It relies heavily
on type-checking from TypeScript to ensure that usage of the library is
correct.  There is __absolutely no__ runtime validation in this library.

## About

Omnimatch works with any discriminant and any set of discriminant values, even
unbounded ones. The only restriction is that the discriminant values be valid
index types (in other words: `string | number`).

Omnimatch leverages the object-literal syntax of JavaScript to provide an
experience similar to `match` or `case` expressions in functional programming
languages.

It provides very strong type-checking. It can infer:

- the types of the parameters within the match arm
- the return type of the `match` function (the union of all possible return
  types of the match arms)

It allows for destructuring tagged unions in a huge variety of scenarios. For
example, the following sections contain some more advanced usage.

## Install

Install the package using `npm`:

`npm install omnimatch@1.0.0-development.1`

Import the required functions:

```typescript
import { factory, match } from "omnimatch";
```

## Why

Rust, ML, and other languages have fancy `match`/`case` expressions. In
TypeScript, we have strongly-typed tagged unions like below:

```typescript
interface VariantA {
    kind: "A";
    foo: number;
}

interface VariantB {
    kind: "B";
    bar: string;
}

type AB = VariantA | VariantB;
```

If you have a lot of variants, it's common to use a helper function to
destructure these values that looks like this:

```typescript
interface ABPattern<T> {
  A: (a: A) => T,
  B: (b: B) => T
}

function matchAB<T>(input: AB, pattern: ABPattern<T>) : T {
  return (pattern as any)[input.kind](input);
}

declare const ab : AB;

const x: number = matchAB(ab, {
  A: ({ foo }) => foo,
  B: ({ bar }) => +bar
});
```

## Use

### Match

This redundancy can get onerous, especially if you have a lot of tagged unions.
Omnimatch provides a single `match` function that will work for any
discriminated union, using any discriminant property, and any set of
discriminant values. It provides strong type-checking and inference.

```typescript
import { match } from "omnimatch";

declare const ab : AB;

// Type of x and of the pattern are inferred
const x = match(ab, {
  A: (a) => a.foo,
  B: (b) => +b.bar
});

```

### Factory

Similarly, it can become tiring to type `... kind: "A" ...` many times when
fabricating new variants, so Omnimatch also provides a `factory` function that
can assist in the creation of variants:

```typescript
import { factory } from "omnimatch";

const make = factory<AB>();

const a : A = make.A({ foo: 10 });
```

The properties of the `make` object returned from `factory` are strongly-typed
and will automatically add the `kind` property.

### Unions with Multiple Variants Having the Same Discriminant

```typescript
interface A {
  kind: "A";
  foo: string;
}

interface B {
  kind: "B";
  bar: number;
  funnyProperty?: undefined;
}

interface FunnyB {
  kind: "B";
  bar: number;
  funnyProperty: string;
}

declare const ab: A | B | FunnyB;

match(ab, {
  A: (a) => a.foo,
  // Type of `b` below is refined to `B | FunnyB`
  B: (b) => b.funnyProperty ? b.funnyProperty : "" + b.bar
});
```

### Overriding the Discriminant

Omnimatch uses `"kind"` as its default disciminant. The third positional
argument to `match` overrides this behavior. Strong type-checking will
work regardless of the choice of discriminant.

```typescript
interface Dillo {
  category: "animal",
  subcategory: "mammal",
  weight: number,
  color: string
}

interface Shark {
  category: "animal",
  subcategory: "fish",
  confirmedKills: number
}

interface FlyTrap {
  category: "plant",
  confirmedKills: number
}

declare const thing: Dillo | Shark | FlyTrap;

match(thing, {
  "animal": (ani: Dillo | Shark) => ...,
  "plant": (flytrap) => ...,
}, "category"); // Override discriminant in final argument
```

### Unbounded discriminants

Type-checking bounds are still as strong as possible, even when the
discriminant value is unbounded. This could be useful if you don't
precisely know the variation in a field, but still want to handle
some different cases.

```typescript
type UnboundedKind = {
    kind: string
} & ({
    foo: number
} | {
    bar: string
});

declare const ubKind: UnboundedKind;

// Still allowed. Return type will always be inferred as optional,
// since the variation of "kind" is unconstrained
match(ubKind, {
  "someKind": (x) => {
    console.log("Got a value with \"someKind\", but nothing else is known!");
    return 0;
  },
  "someOtherKind": (x) => {
    console.log("This time, we got a \"someOtherKind\", but I still don't know anything else.");
    return 1;
  }
});
```

### Tuple Unions (numerical index discriminant)

S-Expressions are the primitive syntax of Lisp-like programming languages.

Omnimatch can be used to destructure them by modeling them as strong tuple
types, which can be discriminated just as well as unions of interfaces.

```typescript
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
        return match(x, {
            "+": ([_, ...args]: Add) => args.map(boundEval).reduce((l, r) => l + r),
            "*": ([_, ...args]: Mul) => args.map(boundEval).reduce((l, r) => l * r),
            "-": ([_, left, ...right]: Sub) => {
                // Support a unary -
                if (right.length <= 0) {
                    return -boundEval(left);
                } else {
                    return boundEval(left) - right.map(boundEval).reduce((l, r) => l + r);
                }
            },
            "/": ([_, left, right]: Div) => boundEval(left) / boundEval(right),
            // eval body in the env, after extending it with the new name
            "let": ([_, [name, value], body]: Let) => evaluate(body, { ...env, [name]: boundEval(value) }),
        }, 0); // 0 as discriminator is read "first item of the tuple"
    }
}

console.assert(
    evaluate(["let", ["x", ["+", 100, 31]], ["/", "x", 15]]) - 8.7333 <= 0.001,
    "Evaluation did not have expected result."
)
```

## License

Omnimatch is licensed under the MIT license. See the included
[LICENSE](./LICENSE) file.

