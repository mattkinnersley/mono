/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  LastInTuple,
  Relationship2,
  RelationshipsSchema,
  TableSchema2,
} from '../table-schema.js';
import type {TableBuilder} from './table-builder.js';

export function relationships<
  TTableSchema extends TableSchema2,
  TRelationships extends Record<string, RelationshipBuilder<Relationship2>>,
>(
  _table: TableBuilder<TTableSchema>,
  cb: (
    connect: <T extends TableSchema2>(
      sourceField: keyof TTableSchema['columns'] & string,
      destField: keyof T['columns'] & string,
      destSchema: T,
    ) => RelationshipBuilder<Relationship2>,
  ) => TRelationships,
): RelationshipsSchema {
  const relationshipSchemas = Object.fromEntries(
    Object.entries(cb(connect)).map(([k, v]) => [k, v.schema]),
  ) as {[K in keyof TRelationships]: TRelationships[K]['schema']};
  return relationshipSchemas;
}

export function connect<
  TSource extends TableSchema2,
  TDest extends TableSchema2,
>(
  sourceField: keyof TSource['columns'] & string,
  destField: keyof TDest['columns'] & string,
  destSchema: TDest,
) {
  return new RelationshipBuilder([
    {
      sourceField,
      destField,
      destSchema,
    },
  ]);
}

class RelationshipBuilder<TShape extends Relationship2> {
  readonly #schema: TShape;

  constructor(schema: TShape) {
    this.#schema = schema;
  }

  connect<TDest extends TableSchema2>(
    sourceField: keyof GetDestSchema<TShape>['columns'] & string,
    destField: keyof TDest['columns'] & string,
    destSchema: TDest,
  ) {
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
}

type GetDestSchema<TShape extends Relationship2> =
  LastInTuple<TShape>['destSchema'];
