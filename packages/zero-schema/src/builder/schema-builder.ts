/* eslint-disable @typescript-eslint/no-explicit-any */
import type {Relationship, TableSchema} from '../table-schema.js';
import type {Relationships} from './relationship-builder.js';
import type {TableBuilderWithColumns} from './table-builder.js';

export function createSchema<
  TTables extends Record<string, TableBuilderWithColumns<TableSchema>>,
  TRelationships extends Record<string, Relationships>,
>(
  tables: TTables,
  relationships: TRelationships,
): {
  tables: {
    [K in keyof TTables as TTables[K]['schema']['name']]: TTables[K]['schema'];
  };
  relationships: {
    [K in keyof TRelationships as TRelationships[K]['name']]: TRelationships[K]['relationships'];
  };
} {
  const retTables: Record<string, TableSchema> = {};
  const retRelationships: Record<string, Record<string, Relationship>> = {};

  Object.values(tables).forEach(table => {
    retTables[table.schema.name] = table.schema;
  });
  Object.values(relationships).forEach(relationship => {
    retRelationships[relationship.name] = relationship.relationships;
  });

  return {
    tables: retTables,
    relationships: retRelationships,
  } as any;
}
