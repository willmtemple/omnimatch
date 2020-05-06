// Copyright (c) Will Temple
// Licensed under the MIT license.

/**
 * Delegate handling of an input to a function based on the value of a discriminant property.
 *
 * The value of the input's discriminant is used to index into the pattern to retrieve a
 * function to handle the input.
 *
 * If no entry exists in the pattern for the discriminant of the input, then `undefined` is
 * returned. If no `discriminant` is provided, then the string "kind" is used as the default
 * discriminant.
 *
 * @param input a value with a type discriminated by the {@link discriminator}
 * @param pattern a map from discriminator values to a delegate function to handle that value
 * @param discriminant the property name to use as the discriminant (`"kind"` if not provided)
 */
export function match<
  DiscriminatedUnion extends { [K in Discriminant]: string | number },
  Pattern extends Partial<
    {
      [K in DiscriminatedUnion[Discriminant]]: (
        v: Extract<DiscriminatedUnion, { kind: K }>
      ) => any;
    }
  >,
  Discriminant extends string | number = "kind"
>(
  input: DiscriminatedUnion,
  pattern: Exclude<
    keyof Pattern,
    DiscriminatedUnion[Discriminant]
  > extends never
    ? Pattern
    : Partial<
        {
          [K in DiscriminatedUnion[Discriminant]]: (
            v: Extract<DiscriminatedUnion, { kind: K }>
          ) => any;
        }
      >,
  discriminant?: Discriminant
): typeof pattern extends {
  [K in DiscriminatedUnion[Discriminant]]: (
    v: Extract<DiscriminatedUnion, { kind: K }>
  ) => infer Res;
}
  ? string extends DiscriminatedUnion[Discriminant]
    ? Res | undefined
    : unknown extends Res
    ? undefined
    : Res
  : typeof pattern extends Partial<
      {
        [K in DiscriminatedUnion[Discriminant]]: (
          v: Extract<DiscriminatedUnion, { kind: K }>
        ) => infer Res;
      }
    >
  ? unknown extends Res
    ? undefined
    : Res | undefined
  : never {
  const delegate: (v: any) => any | undefined = (pattern as any)[
    (input as any)[discriminant ?? "kind"]
  ];
  return delegate ? delegate(input) : undefined;
}

export function factory<
  Union extends { [K in Discriminant]: string | number },
  Discriminant extends string | number = "kind"
>(
  discriminant?: Discriminant
): {
  [K in Union[Discriminant]]: (
    fields: {
      [Field in Exclude<
        keyof Extract<Union, { kind: K }>,
        Discriminant
      >]: Extract<Union, { kind: K }>[Field];
    }
  ) => Extract<Union, { kind: K }>;
} {
  const d = discriminant ?? "kind";
  let lazyContainer: any;
  const proto: any = new Proxy(
    {},
    {
      get(_: never, key: number | string) {
        lazyContainer[key] = (fields: any) => ({
          [d]: key,
          ...fields,
        });

        return lazyContainer[key];
      },
    }
  );

  lazyContainer = Object.create(proto);

  return lazyContainer;
}

