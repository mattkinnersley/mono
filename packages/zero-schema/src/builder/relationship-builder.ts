/* eslint-disable @typescript-eslint/no-explicit-any */
import type {Relationship, TableSchema} from '../table-schema.js';
import type {TableBuilderWithColumns} from './table-builder.js';

type ConnectArg<TSourceField, TDestField, TDest extends TableSchema> = {
  sourceField: TSourceField;
  destField: TDestField;
  destSchema: TableBuilderWithColumns<TDest>;
};

type ConnectResult<TSourceField, TDestField, TDest extends TableSchema> = {
  sourceField: TSourceField;
  destField: TDestField;
  destSchema: TDest;
};

type Prev = [-1, 0, 1, 2, 3, 4, 5, 6];
export type PreviousSchema<
  TSource extends TableSchema,
  K extends number,
  TDests extends TableSchema[],
> = K extends 0 ? TSource : TDests[Prev[K]];

export type Relationships = {
  name: string;
  relationships: Record<string, Relationship>;
};

export function relationships<TSource extends TableSchema>(
  table: TableBuilderWithColumns<TSource>,
): RelationshipsBuilder<
  {name: TSource['name']; relationships: Record<string, Relationship>},
  TSource
> {
  return new RelationshipsBuilder({
    name: table.build().name,
    relationships: {},
  });
}

class RelationshipsBuilder<
  TShape extends {name: string; relationships: Record<string, Relationship>},
  TSource extends TableSchema,
> {
  readonly #shape: TShape;
  constructor(shape: TShape) {
    this.#shape = shape;
  }

  many<
    TName extends string,
    TDests extends TableSchema[],
    TSourceFields extends {
      [K in keyof TDests]: (keyof PreviousSchema<
        TSource,
        K & number,
        TDests
      >['columns'] &
        string)[];
    },
    TDestFields extends {
      [K in keyof TDests]: (keyof TDests[K]['columns'] & string)[];
    },
  >(
    name: TName,
    ...args: {
      [K in keyof TDests]: ConnectArg<
        TSourceFields[K],
        TDestFields[K],
        TDests[K]
      >;
    }
  ): RelationshipsBuilder<
    {
      name: TShape['name'];
      relationships: Omit<TShape['relationships'], TName> & {
        [K in TName]: {
          [K in keyof TDests]: ConnectResult<
            TSourceFields[K],
            TDestFields[K],
            TDests[K]
          >;
        };
      };
    },
    TSource
  > {
    return {
      ...this.#shape,
      [name]: many(args),
    } as any;
  }

  one() {}

  build() {
    return this.#shape;
  }
}

function many(
  args: readonly ConnectArg<any, any, any>[],
): ConnectResult<any, any, any>[] {
  return args.map(arg => ({
    sourceField: arg.sourceField,
    destField: arg.destField,
    destSchema: arg.destSchema.build(),
  }));
}
