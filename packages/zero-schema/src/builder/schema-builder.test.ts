/**
 * Relationships as secondary.
 */

import {test} from 'vitest';
import {table, number, string} from './table-builder.js';
import {relationships} from './relationship-builder.js';
import type {Query} from '../../../zql/src/query/query2.js';

test('building a schema', () => {
  const user = table('user')
    .columns({
      id: string(),
      name: string(),
      recruiterId: number(),
    })
    .primaryKey('id');

  const userRelationships = relationships(user, connect => ({
    recruiter: connect('id', 'recruiterId', user),
  }));

  // const schema = createSchema({user, userRelationships});

  const schema = {
    allTables: {
      user: user.build(),
    },
    allRelationships: {
      user: {
        recruiter: userRelationships.recruiter,
      },
    },
  } as const;

  const q = {} as Query<'user', typeof schema>;
  const r = q.related('recruiter', q => q.related('recruiter')).run();
});
