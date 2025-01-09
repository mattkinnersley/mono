/* eslint-disable @typescript-eslint/no-explicit-any */
import type {Relationship2, TableSchema2} from '../table-schema.js';
import type {TableBuilderWithColumns} from './table-builder.js';

type ConnectArg<TSourceField, TDestField, TDest extends TableSchema2> = {
  sourceField: TSourceField;
  destField: TDestField;
  destSchema: TableBuilderWithColumns<TDest>;
};

type ConnectResult<TSourceField, TDestField, TDest extends TableSchema2> = {
  sourceField: TSourceField;
  destField: TDestField;
  destSchema: TDest;
};

type Prev = [-1, 0, 1, 2, 3, 4, 5, 6];
export type PreviousSchema<
  TSource extends TableSchema2,
  K extends number,
  TDests extends TableSchema2[],
> = K extends 0 ? TSource : TDests[Prev[K]];

export type Relationships = {
  name: string;
  relationships: Record<string, Relationship2>;
};

export function relationships<
  TSource extends TableSchema2,
  TRelationships extends Record<string, Relationship2>,
>(
  table: TableBuilderWithColumns<TSource>,
  cb: (
    many: <
      TDests extends TableSchema2[],
      TSourceFields extends {
        [K in keyof TDests]: keyof PreviousSchema<
          TSource,
          K & number,
          TDests
        >['columns'] &
          string;
      },
      TDestFields extends {
        [K in keyof TDests]: keyof TDests[K]['columns'] & string;
      },
    >(
      ...args: {
        [K in keyof TDests]: ConnectArg<
          TSourceFields[K],
          TDestFields[K],
          TDests[K]
        >;
      }
    ) => {
      [K in keyof TDests]: ConnectResult<
        TSourceFields[K],
        TDestFields[K],
        TDests[K]
      >;
    },
  ) => TRelationships,
): {name: TSource['name']; relationships: TRelationships} {
  return {
    name: table.build().name,
    relationships: cb(many as any),
  };
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
