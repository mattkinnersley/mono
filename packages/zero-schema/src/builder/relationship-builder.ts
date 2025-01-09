/* eslint-disable @typescript-eslint/no-explicit-any */
import type {Relationship2, TableSchema2} from '../table-schema.js';
import type {TableBuilderWithColumns} from './table-builder.js';

// export function relationships<TSource extends TableSchema2>(
//   _table: TSource,
// ): RelationshipsBuilder<Record<string, never>, TSource> {
//   return new RelationshipsBuilder({});
// }

// interface RelationshipBuilder<TShape extends Relationship2> {

// }

// class RelationshipsBuilder<
//   TShape extends RelationshipsSchema,
//   TSource extends TableSchema2,
// > {
//   readonly #schema: TShape;

//   constructor(schema: TShape) {
//     this.#schema = schema;
//   }

//   one<TName extends string>(
//     name: TName,
//     connect: <TDest extends TableSchema2>(
//       sourceField: keyof TSource['columns'] & string,
//       destField: keyof TSource['columns'] & string,
//       destSchema: TableBuilderWithColumns<TDest>,
//     ) => RelationshipBuilder<>,
//   ) {}

//   many<TName extends string>(name: TName) {}

//   // connect<TDest extends TableSchema2>(
//   //   sourceField: keyof TSource['columns'],
//   //   destField: keyof TDest['columns'],
//   //   destSchema: TableBuilderWithColumns<TDest>,
//   // ) {
//   //   return new RelationshipsBuilder({
//   //     ...this.#schema,
//   //     [sourceField]: {
//   //       sourceField,
//   //       destField,
//   //       destSchema: destSchema.build(),
//   //     },
//   //   } as any);
//   // }
// }

// ====

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

export function relationships<
  TSource extends TableSchema2,
  TRelationships extends Record<string, Relationship2>,
>(
  _table: TableBuilderWithColumns<TSource>,
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
): TRelationships {
  return cb(many as any);
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
