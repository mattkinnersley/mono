import type {
  FieldRelationship,
  JunctionRelationship,
  SchemaValue,
  TableSchema,
} from './table-schema.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function table<TName extends string>(name: TName) {
  return new TableBuilder({
    tableName: name,
    columns: {},
    primaryKey: null as any,
    relationships: {},
  });
}

export function string() {
  return new ColumnBuilder({type: 'string', optional: false});
}

export function number() {
  return new ColumnBuilder({type: 'number', optional: false});
}

export function boolean() {
  return new ColumnBuilder({type: 'boolean', optional: false});
}

export function json() {
  return new ColumnBuilder({type: 'json', optional: false});
}

export const column = {
  string,
  number,
  boolean,
  json,
};

type Lazy<T> = () => T;

class TableBuilder<TShape extends TableSchema> {
  readonly #schema: TShape;
  constructor(schema: TShape) {
    this.#schema = schema;
  }

  columns<TColumns extends Record<string, ColumnBuilder<SchemaValue>>>(
    columns: TColumns,
  ): TableBuilderWithColumns<{
    tableName: TShape['tableName'];
    columns: {[K in keyof TColumns]: TColumns[K]['schema']};
    primaryKey: TShape['primaryKey'];
    relationships: TShape['relationships'];
  }> {
    const columnSchemas = Object.fromEntries(
      Object.entries(columns).map(([k, v]) => [k, v.schema]),
    ) as {[K in keyof TColumns]: TColumns[K]['schema']};
    return new TableBuilderWithColumns({
      ...this.#schema,
      columns: columnSchemas,
    }) as any;
  }
}

class TableBuilderWithColumns<TShape extends TableSchema> {
  readonly #schema: TShape;

  constructor(schema: TShape) {
    this.#schema = schema;
  }

  primaryKey<TPKColNames extends (keyof TShape['columns'])[]>(
    ...pkColumnNames: TPKColNames
  ) {
    return new TableBuilderWithColumns({
      ...this.#schema,
      primaryKey: pkColumnNames,
    });
  }

  relationships<
    TRelationships extends Record<
      string,
      RelationshipBuilder<FieldRelationship | JunctionRelationship>
    >,
  >(
    cb: (
      connect: <TDest extends TableSchema>(
        sourceField: keyof TShape['columns'] & string,
        destField: keyof TDest['columns'] & string,
        destSchema: TDest | Lazy<TDest>,
      ) => RelationshipBuilder<FieldRelationship | JunctionRelationship>,
    ) => TRelationships,
  ): TableBuilderWithColumns<{
    tableName: TShape['tableName'];
    columns: TShape['columns'];
    primaryKey: TShape['primaryKey'];
    relationships: {[K in keyof TRelationships]: TRelationships[K]['schema']};
  }> {
    const relationshipSchemas = Object.fromEntries(
      Object.entries(cb(connect)).map(([k, v]) => [k, v.schema]),
    ) as {[K in keyof TRelationships]: TRelationships[K]['schema']};

    return new TableBuilderWithColumns({
      ...this.#schema,
      relationships: relationshipSchemas,
    }) as any;
  }

  build() {
    return this.#schema;
  }
}

export function connect<TSource extends TableSchema, TDest extends TableSchema>(
  sourceField: keyof TSource['columns'] & string,
  destField: keyof TDest['columns'] & string,
  destSchema: TDest | Lazy<TDest>,
) {
  return new RelationshipBuilder({
    sourceField,
    destField,
    destSchema,
  });
}

class ColumnBuilder<TShape extends SchemaValue> {
  readonly #schema: TShape;
  constructor(schema: TShape) {
    this.#schema = schema;
  }

  optional(): ColumnBuilder<
    TShape & {
      optional: true;
    }
  > {
    return new ColumnBuilder({
      ...this.#schema,
      optional: true,
    } as const);
  }

  get schema() {
    return this.#schema;
  }
}

type TypeOrReturnType<T> = T extends (...args: any[]) => any
  ? ReturnType<T>
  : T;

type GetDestSchema<TShape extends FieldRelationship | JunctionRelationship> =
  TShape extends FieldRelationship
    ? TypeOrReturnType<TShape['destSchema']>
    : TypeOrReturnType<(TShape & JunctionRelationship)[1]['destSchema']>;

class RelationshipBuilder<
  TShape extends FieldRelationship | JunctionRelationship,
> {
  readonly #schema: TShape extends FieldRelationship ? [TShape] : TShape;

  constructor(schema: TShape | undefined) {
    if (Array.isArray(schema)) {
      this.#schema = schema as any;
    } else {
      this.#schema = [schema] as any;
    }
  }

  connect<TDest extends TableSchema>(
    sourceField: keyof GetDestSchema<TShape>['columns'] & string,
    destField: keyof TDest['columns'] & string,
    destSchema: TDest | Lazy<TDest>,
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
    if (this.#schema.length === 1) {
      return this.#schema[0] as TShape;
    }
    return this.#schema as TShape;
  }
}
