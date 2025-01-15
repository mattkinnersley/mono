/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {resolver} from '@rocicorp/resolver';
import {assert} from '../../../shared/src/asserts.js';
import type {Writable} from '../../../shared/src/writable.js';
import {hashOfAST} from '../../../zero-protocol/src/ast-hash.js';
import type {
  AST,
  Condition,
  Ordering,
  Parameter,
  System,
} from '../../../zero-protocol/src/ast.js';
import type {Row as IVMRow} from '../../../zero-protocol/src/data.js';
import {
  isOneHop,
  type FullSchema,
  type TableSchema,
} from '../../../zero-schema/src/table-schema.js';
import {buildPipeline, type BuilderDelegate} from '../builder/builder.js';
import {ArrayView} from '../ivm/array-view.js';
import type {Input} from '../ivm/operator.js';
import type {Format, ViewFactory} from '../ivm/view.js';
import {dnf} from './dnf.js';
import {
  and,
  cmp,
  ExpressionBuilder,
  type ExpressionFactory,
} from './expression.js';
import type {AdvancedQuery} from './query-internal.js';
import type {
  GetFieldTypeNoUndefined,
  HumanReadable,
  Operator,
  PullRow,
  Query,
} from './query.js';
import type {TypedView} from './typed-view.js';

type AnyQuery = Query<FullSchema, string, any>;

export function newQuery<
  TSchema extends FullSchema,
  TTable extends keyof FullSchema['tables'] & string,
>(
  delegate: QueryDelegate,
  schema: TSchema,
  table: TTable,
): Query<TSchema, TTable> {
  return new QueryImpl(delegate, schema, table);
}

function newQueryWithDetails<
  TSchema extends FullSchema,
  TTable extends keyof FullSchema['tables'] & string,
>(
  delegate: QueryDelegate,
  schema: TSchema,
  tableName: TTable,
  ast: AST,
  format: Format | undefined,
): Query<TSchema, TTable> {
  return new QueryImpl(delegate, schema, tableName, ast, format);
}

export type CommitListener = () => void;
export type GotCallback = (got: boolean) => void;
export interface QueryDelegate extends BuilderDelegate {
  addServerQuery(ast: AST, gotCallback?: GotCallback | undefined): () => void;
  onTransactionCommit(cb: CommitListener): () => void;
  batchViewUpdates<T>(applyViewUpdates: () => T): T;
}

export function staticParam(
  anchorClass: 'authData' | 'preMutationRow',
  field: string | string[],
): Parameter {
  return {
    type: 'static',
    anchor: anchorClass,
    // for backwards compatibility
    field: field.length === 1 ? field[0] : field,
  };
}

export const SUBQ_PREFIX = 'zsubq_';

export abstract class AbstractQuery<
  TSchema extends FullSchema,
  TTable extends keyof TSchema['tables'] & string,
  TReturn = PullRow<TTable, TSchema>,
> implements AdvancedQuery<TSchema, TTable, TReturn>
{
  readonly #ast: AST;
  readonly #schema: TSchema;
  readonly #tableName: TTable;
  readonly #format: Format;
  #hash: string = '';

  constructor(
    schema: TSchema,
    tableName: TTable,
    ast: AST,
    format?: Format | undefined,
  ) {
    this.#ast = ast;
    this.#format = format ?? {singular: false, relationships: {}};
    this.#schema = schema;
    this.#tableName = tableName;
  }

  get format(): Format {
    return this.#format;
  }

  hash(): string {
    if (!this.#hash) {
      const ast = this._completeAst();
      const hash = hashOfAST(ast);
      this.#hash = hash;
    }
    return this.#hash;
  }

  protected abstract _system: System;

  protected abstract _newQuery<
    TSchema extends FullSchema,
    TTable extends keyof TSchema['tables'] & string,
    TReturn,
  >(
    schema: TSchema,
    table: TTable,
    ast: AST,
    format: Format | undefined,
  ): Query<TSchema, TTable, TReturn>;

  one(): Query<TSchema, TTable, TReturn | undefined> {
    return this._newQuery(
      this.#schema,
      this.#tableName,
      {
        ...this.#ast,
        limit: 1,
      },
      {
        ...this.#format,
        singular: true,
      },
    );
  }
  whereExists(
    relationship: string,
    cb?: (q: AnyQuery) => AnyQuery,
  ): Query<TSchema, TTable, TReturn> {
    return this.where(({exists}) => exists(relationship, cb));
  }

  related(relationship: string, cb?: (q: AnyQuery) => AnyQuery): AnyQuery {
    if (relationship.startsWith(SUBQ_PREFIX)) {
      throw new Error(
        `Relationship names may not start with "${SUBQ_PREFIX}". That is a reserved prefix.`,
      );
    }
    cb = cb ?? (q => q);

    const related = this.#schema.relationships[this.#tableName][relationship];
    assert(related, 'Invalid relationship');
    if (isOneHop(related)) {
      const {destSchema, destField, sourceField} = related[0];
      const sq = cb(
        this._newQuery(
          this.#schema,
          destSchema.name,
          {
            table: destSchema.name,
            alias: relationship,
          },
          undefined,
        ),
      ) as unknown as QueryImpl<any, any>;

      return this._newQuery(
        this.#schema,
        this.#tableName,
        {
          ...this.#ast,
          related: [
            ...(this.#ast.related ?? []),
            {
              system: this._system,
              correlation: {
                parentField: sourceField,
                childField: destField,
              },
              subquery: addPrimaryKeysToAst(destSchema, sq.#ast),
            },
          ],
        },
        {
          ...this.#format,
          relationships: {
            ...this.#format.relationships,
            [relationship]: sq.#format,
          },
        },
      );
    }

    if (isJunctionRelationship(related)) {
      assert(related.length === 2, 'Invalid relationship');
      const [firstRelation, secondRelation] = related;
      const {destSchema} = secondRelation;
      const junctionSchema = firstRelation.destSchema;
      const sq = cb(
        this._newQuery(
          destSchema,
          {
            table: destSchema.tableName,
            alias: relationship,
          },
          undefined,
        ),
      ) as unknown as QueryImpl<TableSchema, QueryType>;

      return this._newQuery(
        this.#schema,
        {
          ...this.#ast,
          related: [
            ...(this.#ast.related ?? []),
            {
              system: this._system,
              correlation: {
                parentField: firstRelation.sourceField,
                childField: firstRelation.destField,
              },
              subquery: {
                table: junctionSchema.tableName,
                alias: relationship,
                orderBy: addPrimaryKeys(junctionSchema, undefined),
                related: [
                  {
                    system: this._system,
                    correlation: {
                      parentField: secondRelation.sourceField,
                      childField: secondRelation.destField,
                    },
                    hidden: true,
                    subquery: addPrimaryKeysToAst(destSchema, sq.#ast),
                  },
                ],
              },
            },
          ],
        },
        {
          ...this.#format,
          relationships: {
            ...this.#format.relationships,
            [relationship]: sq.#format,
          },
        },
      );
    }

    throw new Error(`Invalid relationship ${relationship}`);
  }

  where(
    fieldOrExpressionFactory: string | ExpressionFactory<TSchema, TTable>,
    opOrValue?: Operator | GetFieldTypeNoUndefined<any, any, any> | Parameter,
    value?: GetFieldTypeNoUndefined<any, any, any> | Parameter,
  ): Query<TSchema, TTable, TReturn> {
    let cond: Condition;

    if (typeof fieldOrExpressionFactory === 'function') {
      cond = fieldOrExpressionFactory(new ExpressionBuilder(this._exists));
    } else {
      assert(opOrValue !== undefined, 'Invalid condition');
      cond = cmp(fieldOrExpressionFactory, opOrValue, value);
    }

    const existingWhere = this.#ast.where;
    if (existingWhere) {
      cond = and(existingWhere, cond);
    }

    return this._newQuery(
      this.#schema,
      this.#tableName,
      {
        ...this.#ast,
        where: dnf(cond),
      },
      this.#format,
    );
  }

  start(
    row: Partial<PullRow<TTable, TSchema>>,
    opts?: {inclusive: boolean} | undefined,
  ): Query<TSchema, TTable, TReturn> {
    return this._newQuery(
      this.#schema,
      this.#tableName,
      {
        ...this.#ast,
        start: {
          row,
          exclusive: !opts?.inclusive,
        },
      },
      this.#format,
    );
  }

  limit(limit: number): Query<TSchema, TTable, TReturn> {
    if (limit < 0) {
      throw new Error('Limit must be non-negative');
    }
    if ((limit | 0) !== limit) {
      throw new Error('Limit must be an integer');
    }

    return this._newQuery(
      this.#schema,
      this.#tableName,
      {
        ...this.#ast,
        limit,
      },
      this.#format,
    );
  }

  orderBy<TSelector extends keyof TSchema['tables'][TTable]['columns']>(
    field: TSelector,
    direction: 'asc' | 'desc',
  ): Query<TSchema, TTable, TReturn> {
    return this._newQuery(
      this.#schema,
      this.#tableName,
      {
        ...this.#ast,
        orderBy: [...(this.#ast.orderBy ?? []), [field as string, direction]],
      },
      this.#format,
    );
  }

  protected _exists = (
    relationship: string,
    cb: (query: AnyQuery) => AnyQuery = q => q,
  ): Condition => {
    const related = this.#schema.relationships[this.#tableName][relationship];
    assert(related, 'Invalid relationship');

    if (isOneHop(related)) {
      const {destSchema} = related[0];
      const sq = cb(
        this._newQuery(
          this.#schema,
          destSchema.name,
          {
            table: destSchema.name,
            alias: `${SUBQ_PREFIX}${relationship}`,
          },
          undefined,
        ),
      ) as unknown as QueryImpl<any, any>;
      return {
        type: 'correlatedSubquery',
        related: {
          system: this._system,
          correlation: {
            parentField: related.sourceField,
            childField: related.destField,
          },
          subquery: addPrimaryKeysToAst(destSchema, sq.#ast),
        },
        op: 'EXISTS',
      };
    }

    if (isJunctionRelationship(related)) {
      assert(related.length === 2, 'Invalid relationship');
      const [firstRelation, secondRelation] = related;
      const {destSchema} = secondRelation;
      const junctionSchema = firstRelation.destSchema;
      const queryToDest = cb(
        this._newQuery(
          destSchema,
          {
            table: destSchema.tableName,
            alias: `${SUBQ_PREFIX}${relationship}`,
          },
          undefined,
        ),
      );

      return {
        type: 'correlatedSubquery',
        related: {
          system: this._system,
          correlation: {
            parentField: firstRelation.sourceField,
            childField: firstRelation.destField,
          },
          subquery: {
            table: junctionSchema.tableName,
            alias: `${SUBQ_PREFIX}${relationship}`,
            orderBy: addPrimaryKeys(junctionSchema, undefined),
            where: {
              type: 'correlatedSubquery',
              related: {
                system: this._system,
                correlation: {
                  parentField: secondRelation.sourceField,
                  childField: secondRelation.destField,
                },

                subquery: addPrimaryKeysToAst(destSchema, queryToDest.#ast),
              },
              op: 'EXISTS',
            },
          },
        },
        op: 'EXISTS',
      };
    }

    throw new Error(`Invalid relationship ${relationship}`);
  };

  #completedAST: AST | undefined;

  protected _completeAst(): AST {
    if (!this.#completedAST) {
      const finalOrderBy = addPrimaryKeys(
        this.#schema.tables[this.#tableName],
        this.#ast.orderBy,
      );
      if (this.#ast.start) {
        const {row} = this.#ast.start;
        const narrowedRow: Writable<IVMRow> = {};
        for (const [field] of finalOrderBy) {
          narrowedRow[field] = row[field];
        }
        this.#completedAST = {
          ...this.#ast,
          start: {
            ...this.#ast.start,
            row: narrowedRow,
          },
          orderBy: finalOrderBy,
        };
      } else {
        this.#completedAST = {
          ...this.#ast,
          orderBy: addPrimaryKeys(
            this.#schema.tables[this.#tableName],
            this.#ast.orderBy,
          ),
        };
      }
    }
    return this.#completedAST;
  }

  abstract materialize(): TypedView<HumanReadable<TReturn>>;
  abstract materialize<T>(factory: ViewFactory<TSchema, TTable, TReturn, T>): T;
  abstract run(): HumanReadable<TReturn>;
  abstract preload(): {
    cleanup: () => void;
    complete: Promise<void>;
  };
}

export const astForTestingSymbol = Symbol();
export const completedAstSymbol = Symbol();

export class QueryImpl<
  TSchema extends FullSchema,
  TTable extends keyof TSchema['tables'] & string,
  TReturn = PullRow<TTable, TSchema>,
> extends AbstractQuery<TSchema, TTable, TReturn> {
  readonly #delegate: QueryDelegate;
  readonly #ast: AST;

  constructor(
    delegate: QueryDelegate,
    schema: TSchema,
    tableName: TTable,
    ast: AST = {table: tableName},
    format?: Format | undefined,
  ) {
    super(schema, tableName, ast, format);
    this.#delegate = delegate;
    this.#ast = ast;
  }

  protected readonly _system = 'client';

  // Not part of Query or QueryInternal interface
  get [astForTestingSymbol](): AST {
    return this.#ast;
  }

  get [completedAstSymbol](): AST {
    return this._completeAst();
  }

  protected _newQuery<TSchema extends TableSchema, TReturn extends QueryType>(
    schema: NormalizedTableSchema,
    ast: AST,
    format: Format | undefined,
  ): Query<TSchema, TReturn> {
    return newQueryWithDetails(this.#delegate, schema, ast, format);
  }

  materialize<T>(factory?: ViewFactory<TSchema, TReturn, T>): T {
    const ast = this._completeAst();
    const queryCompleteResolver = resolver<true>();
    let queryGot = false;
    const removeServerQuery = this.#delegate.addServerQuery(ast, got => {
      if (got) {
        queryGot = true;
        queryCompleteResolver.resolve(true);
      }
    });

    const input = buildPipeline(ast, this.#delegate);
    let removeCommitObserver: (() => void) | undefined;

    const onDestroy = () => {
      input.destroy();
      removeCommitObserver?.();
      removeServerQuery();
    };

    const view = this.#delegate.batchViewUpdates(() =>
      (factory ?? arrayViewFactory)(
        this,
        input,
        this.format,
        onDestroy,
        cb => {
          removeCommitObserver = this.#delegate.onTransactionCommit(cb);
        },
        queryGot || queryCompleteResolver.promise,
      ),
    );

    return view as T;
  }

  run() {
    const v: TypedView<HumanReadable<TReturn>> = this.materialize();
    const ret = v.data;
    v.destroy();
    return ret;
  }

  preload(): {
    cleanup: () => void;
    complete: Promise<void>;
  } {
    const {resolve, promise: complete} = resolver<void>();
    const ast = this._completeAst();
    const unsub = this.#delegate.addServerQuery(ast, got => {
      if (got) {
        resolve();
      }
    });
    return {
      cleanup: unsub,
      complete,
    };
  }
}

function addPrimaryKeys(
  schema: TableSchema,
  orderBy: Ordering | undefined,
): Ordering {
  orderBy = orderBy ?? [];
  const {primaryKey} = schema;
  const primaryKeysToAdd = new Set(primaryKey);

  for (const [field] of orderBy) {
    primaryKeysToAdd.delete(field);
  }

  if (primaryKeysToAdd.size === 0) {
    return orderBy;
  }

  return [
    ...orderBy,
    ...[...primaryKeysToAdd].map(key => [key, 'asc'] as [string, 'asc']),
  ];
}

function addPrimaryKeysToAst(schema: TableSchema, ast: AST): AST {
  return {
    ...ast,
    orderBy: addPrimaryKeys(schema, ast.orderBy),
  };
}

function arrayViewFactory<
  TSchema extends FullSchema,
  TTable extends string,
  TReturn,
>(
  _query: Query<TSchema, TTable, TReturn>,
  input: Input,
  format: Format,
  onDestroy: () => void,
  onTransactionCommit: (cb: () => void) => void,
  queryComplete: true | Promise<true>,
): TypedView<HumanReadable<TReturn>> {
  const v = new ArrayView<HumanReadable<TReturn>>(input, format, queryComplete);
  v.onDestroy = onDestroy;
  onTransactionCommit(() => {
    v.flush();
  });
  return v;
}
