/**
 * Relationships as secondary.
 */

import {test} from 'vitest';
import {table, number, string} from './table-builder.js';

test('building a schema', () => {
  const user = table('user')
    .columns({
      id: string(),
      name: string(),
      age: number(),
    })
    .primaryKey('id');
});
