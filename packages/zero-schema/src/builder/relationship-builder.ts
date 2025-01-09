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

type ConnectArg<
  TSourceField,
  TDestField extends keyof TDest['columns'],
  TDest extends TableSchema2,
> = {
  sourceField: TSourceField;
  destField: TDestField;
  destSchema: TableBuilderWithColumns<TDest>;
};

type ConnectResult<TSourceField, TDestField, TDest extends TableSchema2> = {
  sourceField: TSourceField;
  destField: TDestField;
  destSchema: TDest;
};

export function relationships<
  TSource extends TableSchema2,
  TRelationships extends Record<string, Relationship2>,
>(
  _table: TableBuilderWithColumns<TSource>,
  cb: (
    many: <TArgs extends ConnectArg<any, any, any>[]>(
      ...args: TArgs
    ) => {
      [K in keyof TArgs]: ConnectResult<
        TArgs[K]['sourceField'],
        TArgs[K]['destField'],
        TArgs[K]['destSchema']['schema']
      >;
    },
  ) => TRelationships,
): TRelationships {
  return cb(many as any);
  // const relationshipSchemas = Object.fromEntries(
  //   Object.entries(cb(connect)).map(([k, v]) => [k, v.schema]),
  // ) as {[K in keyof TRelationships]: TRelationships[K]['schema']};
  // return relationshipSchemas;
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
