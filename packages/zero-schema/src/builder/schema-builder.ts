/* eslint-disable @typescript-eslint/no-explicit-any */
import type {TableSchema} from '../table-schema.js';
import type {Relationships} from './relationship-builder.js';
import type {TableBuilderWithColumns} from './table-builder.js';

export function createSchema<
  TTables extends Record<string, TableBuilderWithColumns<TableSchema>>,
  TRelationships extends Record<string, Relationships>,
>(
  tables: TTables,
  relationships: TRelationships,
): {
  allTables: {
    [K in keyof TTables as TTables[K]['schema']['name']]: TTables[K]['schema'];
  };
  allRelationships: {
    [K in keyof TRelationships as TRelationships[K]['name']]: TRelationships[K]['relationships'];
  };
} {
  throw new Error();
}
