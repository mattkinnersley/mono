/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  FullSchema,
  Relationship2,
  SchemaValueToTSType,
} from '../../../zero-schema/src/table-schema.js';

type LastInTuple<T extends Relationship2> = T extends readonly [infer L]
  ? L
  : T extends readonly [unknown, infer L]
  ? L
  : T extends readonly [unknown, unknown, infer L]
  ? L
  : never;

type AvailableRelationships<
  TTable extends string,
  TSchema extends FullSchema,
> = TSchema['allRelationships'][TTable]['relationships'];

// TODO
export type DestTableName<
  TTable extends string,
  TSchema extends FullSchema,
  TRelationship extends string,
> = LastInTuple<
  TSchema['allRelationships'][TTable]['relationships'][TRelationship]
>['destTable'];

export type DestTableName2<
  TTable extends string,
  TSchema extends FullSchema,
  TRelationship extends string,
> = TSchema['allRelationships'][TTable]['relationships'][TRelationship];

type DestRow<
  TTable extends string,
  TSchema extends FullSchema,
  TRelationship extends string,
> = Row<DestTableName<TTable, TSchema, TRelationship>, TSchema>;

type AddSubreturn<
  TExistingReturn,
  TSubselectReturn,
  TAs extends string,
> = TExistingReturn & {
  [K in TAs]: TSubselectReturn;
};

type PullTableSchema<
  TTable extends string,
  TSchemas extends FullSchema,
> = TSchemas['allTables'][TTable];

type Row<TTable extends string, TSchema extends FullSchema> = {
  [K in keyof PullTableSchema<TTable, TSchema>['columns']]: SchemaValueToTSType<
    PullTableSchema<TTable, TSchema>['columns'][K]
  >;
};

type HumanReadable<T> = T extends object
  ? T extends infer O
    ? {[K in keyof O]: HumanReadable<O[K]>}
    : never
  : T;

export interface Query<
  TTable extends string,
  TSchema extends FullSchema,
  TReturn = Row<TTable, TSchema>,
> {
  related<
    TRelationship extends keyof AvailableRelationships<TTable, TSchema> &
      string,
  >(
    relationship: TRelationship,
  ): Query<
    DestTableName<TTable, TSchema, TRelationship>,
    TSchema,
    AddSubreturn<
      TReturn,
      readonly DestRow<TTable, TSchema, TRelationship>[],
      TRelationship
    >
  >;

  run(): HumanReadable<TReturn>;
}
