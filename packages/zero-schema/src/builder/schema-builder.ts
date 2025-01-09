/* eslint-disable @typescript-eslint/no-explicit-any */
import type {TableSchema2} from '../table-schema.js';
import type {Relationships} from './relationship-builder.js';
import type {TableBuilderWithColumns} from './table-builder.js';

export function createSchema<
  TTables extends Record<string, TableBuilderWithColumns<TableSchema2>>,
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

// export function createSchema<
//   TTables extends TableSchema2[],
//   TRelationships extends Relationships[],
// >(
//   tables: TTables,
//   relationships: TRelationships,
// ): {
//   allTables: {
//     [K in keyof TTables as TTables[K & number]['name']]: TTables[K & number];
//   };
//   allRelationships: {
//     [K in keyof TRelationships as TRelationships[K &
//       number]['name']]: TRelationships[K & number]['relationships'];
//   };
// } {
//   throw new Error();
//   // const allTables: Record<string, TableSchema2> = {};
//   // const allRelationships: Record<string, RelationshipsSchema> = {};
//   // for (const schema of schemas) {
//   //   if ('relationships' in schema) {
//   //     allRelationships[schema.name] = schema.relationships;
//   //   } else {
//   //     allTables[schema.name] = schema;
//   //   }
//   // }
//   // return {allTables, allRelationships} as any;
// }
