import type {SchemaValue, TableSchema2} from '../table-schema.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function table<TName extends string>(name: TName) {
  return new TableBuilder({
    name,
    columns: {},
    primaryKey: null as any,
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

export class TableBuilder<TShape extends TableSchema2> {
  readonly #schema: TShape;
  constructor(schema: TShape) {
    this.#schema = schema;
  }

  columns<TColumns extends Record<string, ColumnBuilder<SchemaValue>>>(
    columns: TColumns,
  ): TableBuilderWithColumns<{
    name: TShape['name'];
    columns: {[K in keyof TColumns]: TColumns[K]['schema']};
    primaryKey: TShape['primaryKey'];
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

export class TableBuilderWithColumns<TShape extends TableSchema2> {
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

  get schema() {
    return this.#schema;
  }

  build() {
    return this.#schema;
  }
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
