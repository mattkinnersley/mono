/* eslint-disable @typescript-eslint/no-explicit-any */
import type {TableSchema2} from '../../../zero-schema/src/table-schema.js';
import type {
  FullSchema,
  Relationship2,
  SchemaValueToTSType,
} from '../../../zero-schema/src/table-schema.js';
import type {ExpressionFactory, ParameterReference} from './expression2.js';
import type {Operator} from './query.js';
import type {TypedView} from './typed-view.js';

type LastInTuple<T extends Relationship2> = T extends readonly [infer L]
  ? L
  : T extends readonly [unknown, infer L]
  ? L
  : T extends readonly [unknown, unknown, infer L]
  ? L
  : never;

type Selector<E extends TableSchema2> = keyof E['columns'];
export type NoJsonSelector<T extends TableSchema2> = Exclude<
  Selector<T>,
  JsonSelectors<T>
>;
type JsonSelectors<E extends TableSchema2> = {
  [K in keyof E['columns']]: E['columns'][K] extends {type: 'json'} ? K : never;
}[keyof E['columns']];

export type GetFieldTypeNoUndefined<
  TSchema extends TableSchema2,
  TColumn extends keyof TSchema['columns'],
  TOperator extends Operator,
> = TOperator extends 'IN' | 'NOT IN'
  ? Exclude<
      SchemaValueToTSType<TSchema['columns'][TColumn]>,
      null | undefined
    >[]
  : TOperator extends 'IS' | 'IS NOT'
  ? Exclude<SchemaValueToTSType<TSchema['columns'][TColumn]>, undefined> | null
  : Exclude<SchemaValueToTSType<TSchema['columns'][TColumn]>, undefined>;

export type AvailableRelationships<
  TTable extends string,
  TSchema extends FullSchema,
> = keyof TSchema['allRelationships'][TTable]['relationships'] & string;

export type DestTableName<
  TTable extends string,
  TSchema extends FullSchema,
  TRelationship extends string,
> = LastInTuple<
  TSchema['allRelationships'][TTable]['relationships'][TRelationship]
>['destTable'];

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

export type PullTableSchema<
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
  related<TRelationship extends AvailableRelationships<TTable, TSchema>>(
    relationship: TRelationship,
  ): Query<
    TTable,
    TSchema,
    AddSubreturn<
      TReturn,
      readonly DestRow<TTable, TSchema, TRelationship>[],
      TRelationship
    >
  >;
  related<
    TRelationship extends AvailableRelationships<TTable, TSchema>,
    TSub extends Query<string, TSchema>,
  >(
    relationship: TRelationship,
    cb: (
      q: Query<DestTableName<TTable, TSchema, TRelationship>, TSchema>,
    ) => TSub,
  ): Query<
    TTable,
    TSchema,
    AddSubreturn<
      TReturn,
      TSub extends Query<string, TSchema, infer TSubReturn>
        ? TSubReturn[]
        : never,
      TRelationship
    >
  >;

  where<
    TSelector extends NoJsonSelector<PullTableSchema<TTable, TSchema>>,
    TOperator extends Operator,
  >(
    field: TSelector,
    op: TOperator,
    value:
      | GetFieldTypeNoUndefined<
          PullTableSchema<TTable, TSchema>,
          TSelector,
          TOperator
        >
      | ParameterReference,
  ): Query<TTable, TSchema, TReturn>;
  where<TSelector extends NoJsonSelector<PullTableSchema<TTable, TSchema>>>(
    field: TSelector,
    value:
      | GetFieldTypeNoUndefined<
          PullTableSchema<TTable, TSchema>,
          TSelector,
          '='
        >
      | ParameterReference,
  ): Query<TTable, TSchema, TReturn>;
  where(
    expressionFactory: ExpressionFactory<TTable, TSchema>,
  ): Query<TTable, TSchema, TReturn>;

  start(
    row: Partial<Row<TTable, TSchema>>,
    opts?: {inclusive: boolean} | undefined,
  ): Query<TTable, TSchema, TReturn>;

  limit(limit: number): Query<TTable, TSchema, TReturn>;

  orderBy<TSelector extends Selector<PullTableSchema<TTable, TSchema>>>(
    field: TSelector,
    direction: 'asc' | 'desc',
  ): Query<TTable, TSchema, TReturn>;

  one(): Query<TTable, TSchema, TReturn | undefined>;

  materialize(): TypedView<TReturn extends undefined ? TReturn : TReturn[]>;

  run(): HumanReadable<TReturn extends undefined ? TReturn : TReturn[]>;

  preload(): {
    cleanup: () => void;
    complete: Promise<void>;
  };
}
