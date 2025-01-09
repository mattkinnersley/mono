/* eslint-disable @typescript-eslint/no-explicit-any */
import type {RelationshipsSchema, TableSchema2} from '../table-schema.js';
import type {Relationships} from './relationship-builder.js';

export function createSchema<TSchemas extends (TableSchema2 | Relationships)[]>(
  ...schemas: TSchemas
): {
  allTables: {
    [K in keyof TSchemas as TSchemas[K &
      number]['name']]: TSchemas[K] extends TableSchema2 ? TSchemas[K] : never;
  };
  allRelationships: {
    [K in keyof TSchemas as TSchemas[K &
      number]['name']]: TSchemas[K] extends Relationships
      ? TSchemas[K]['relationships']
      : never;
  };
} {
  const allTables: Record<string, TableSchema2> = {};
  const allRelationships: Record<string, RelationshipsSchema> = {};
  for (const schema of schemas) {
    if ('relationships' in schema) {
      allRelationships[schema.name] = schema.relationships;
    } else {
      allTables[schema.name] = schema;
    }
  }
  return {allTables, allRelationships} as any;
}
