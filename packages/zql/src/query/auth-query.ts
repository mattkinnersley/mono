import type {AST} from '../../../zero-protocol/src/ast.js';
import {
  normalizeTableSchema,
  type NormalizedTableSchema,
} from '../../../zero-schema/src/normalize-table-schema.js';
import type {
  FullSchema,
  TableSchema,
} from '../../../zero-schema/src/table-schema.js';
import type {Format} from '../ivm/view.js';
import {ExpressionBuilder} from './expression.js';
import {AbstractQuery} from './query-impl.js';
import type {PullRow, Query} from './query.js';
import type {TypedView} from './typed-view.js';

export function authQuery<TSchema extends TableSchema>(
  schema: TSchema,
): Query<TSchema> {
  return new AuthQuery<TSchema>(normalizeTableSchema(schema));
}

export class AuthQuery<
  TSchema extends FullSchema,
  TTable extends keyof TSchema['tables'] & string,
  TReturn = PullRow<TTable, TSchema>,
> extends AbstractQuery<TTableSchema, TReturn> {
  constructor(
    schema: NormalizedTableSchema,
    ast: AST = {table: schema.tableName},
    format?: Format | undefined,
  ) {
    super(schema, ast, format);
  }

  expressionBuilder() {
    return new ExpressionBuilder(this._exists);
  }

  protected readonly _system = 'permissions';

  protected _newQuery<TSchema extends TableSchema, TReturn extends QueryType>(
    schema: NormalizedTableSchema,
    ast: AST,
    format: Format | undefined,
  ): Query<TSchema, TReturn> {
    return new AuthQuery(schema, ast, format);
  }

  get ast() {
    return this._completeAst();
  }

  materialize(): TypedView<Smash<TReturn>> {
    throw new Error('AuthQuery cannot be materialized');
  }

  run(): Smash<TReturn> {
    throw new Error('AuthQuery cannot be run');
  }

  preload(): {
    cleanup: () => void;
    complete: Promise<void>;
  } {
    throw new Error('AuthQuery cannot be preloaded');
  }
}
