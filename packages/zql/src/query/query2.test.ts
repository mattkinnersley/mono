import {test} from 'vitest';
import type {Query} from './query2.js';

test('types', () => {
  const schemas = {
    allTables: {
      user: {
        name: 'user',
        columns: {
          id: {type: 'number'},
          name: {type: 'string'},
          recruiterId: {type: 'number'},
        },
        primaryKey: 'id',
      },
    },
    allRelationships: {
      user: {
        table: 'user',
        relationships: {
          recruiter: [
            {
              sourceField: 'recruiterId',
              destField: 'id',
              destTable: 'user',
            },
          ],
        },
      },
    },
  } as const;
  const q = {} as Query<'user', typeof schemas>;
  const q2 = q.related('recruiter').related('recruiter');
  const d = q2.run();

  // q.related('')
});
