import {test} from 'vitest';
import type {Query} from './query.js';

test('types', () => {
  const user = {
    name: 'user',
    columns: {
      id: {type: 'number'},
      name: {type: 'string'},
      recruiterId: {type: 'number'},
    },
    primaryKey: 'id',
  } as const;
  const schemas = {
    allTables: {
      user,
    },
    allRelationships: {
      user: {
        recruiter: [
          {
            sourceField: 'recruiterId',
            destField: 'id',
            destSchema: user,
          },
        ],
      },
    },
  } as const;
  const q = {} as Query<'user', typeof schemas>;
  const q2 = q.related('recruiter');
  const d = q2.run();

  const q3 = q.related('recruiter', q => q.related('recruiter'));
  const d2 = q3.run();

  // q.related('')
});
