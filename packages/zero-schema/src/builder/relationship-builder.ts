/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  LastInTuple,
  Relationship2,
  TableSchema2,
} from '../table-schema.js';
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

export function relationships<
  TSource extends TableSchema2,
  TRelationships extends Record<string, RelationshipBuilder<any>>,
>(
  // eslint-disable-next-line @typescript-eslint/naming-convention
  table: TableBuilderWithColumns<TSource>,
  cb: (
    connect: <
      TDest extends TableSchema2,
      TSourceField extends keyof TSource['columns'] & string,
      TDestField extends keyof TDest['columns'] & string,
    >(
      sourceField: TSourceField,
      destField: TDestField,
      destSchema: TableBuilderWithColumns<TDest>,
    ) => RelationshipBuilder<
      [
        {
          sourceField: TSourceField;
          destField: TDestField;
          destSchema: TDest;
        },
      ]
    >,
  ) => TRelationships,
): TRelationships {
  return cb(connect);
  // const relationshipSchemas = Object.fromEntries(
  //   Object.entries(cb(connect)).map(([k, v]) => [k, v.schema]),
  // ) as {[K in keyof TRelationships]: TRelationships[K]['schema']};
  // return relationshipSchemas;
}

function connect(
  sourceField: any,
  destField: any,
  destSchema: TableBuilderWithColumns<any>,
) {
  return new RelationshipBuilder([
    {
      sourceField,
      destField,
      destSchema: destSchema.build(),
    },
  ]);
}

class RelationshipBuilder<TShape extends Relationship2> {
  readonly #schema: TShape;

  constructor(schema: TShape) {
    this.#schema = schema;
  }

  connect<
    TDest extends TableSchema2,
    TSourceField extends keyof GetDestSchema<TShape>['columns'] & string,
    TDestField extends keyof TDest['columns'] & string,
  >(sourceField: TSourceField, destField: TDestField, destSchema: TDest) {
    return new RelationshipBuilder([
      ...this.#schema,
      {
        sourceField,
        destField,
        destSchema,
      },
    ] as any);
  }

  get schema(): TShape {
    return this.#schema;
  }

  build(): TShape {
    return this.#schema;
  }
}

type GetDestSchema<TShape extends Relationship2> =
  LastInTuple<TShape>['destSchema'];
