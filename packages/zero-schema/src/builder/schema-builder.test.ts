/**
 * Relationships as secondary.
 */

import {test} from 'vitest';
import {table, number, string} from './table-builder.js';
import {relationships, type PreviousSchema} from './relationship-builder.js';
import type {Query} from '../../../zql/src/query/query2.js';

test('building a schema', () => {
  const user = table('user')
    .columns({
      id: string(),
      name: string(),
      recruiterId: number(),
    })
    .primaryKey('id');

  const issue = table('issue')
    .columns({
      id: string(),
      title: string(),
      ownerId: number(),
    })
    .primaryKey('id');

  const issueLabel = table('issueLabel')
    .columns({
      issueId: number(),
      labelId: number(),
    })
    .primaryKey('issueId', 'labelId');

  const label = table('label')
    .columns({
      id: number(),
      name: string(),
    })
    .primaryKey('id');

  const issueRelationships = relationships(issue, many => ({
    owner: many({
      sourceField: 'ownerId',
      destField: 'id',
      destSchema: user,
    }),
    labels: many(
      {
        sourceField: 'id',
        destField: 'issueId',
        destSchema: issueLabel,
      },
      {
        sourceField: 'labelId',
        destField: 'id',
        destSchema: label,
      },
    ),
  }));

  const userRelationships = relationships(user, many => ({
    recruiter: many({
      sourceField: 'id',
      destField: 'recruiterId',
      destSchema: user,
    }),
  }));

  // const schema = createSchema({user, userRelationships});

  const schema = {
    allTables: {
      user: user.build(),
      issue: issue.build(),
      issueLabel: issueLabel.build(),
      label: label.build(),
    },
    allRelationships: {
      user: {
        recruiter: userRelationships.recruiter,
      },
      issue: {
        owner: issueRelationships.owner,
        labels: issueRelationships.labels,
      },
    },
  } as const;

  const q = {} as Query<'user', typeof schema>;
  const iq = {} as Query<'issue', typeof schema>;
  const r = q.related('recruiter', q => q.related('recruiter')).run();

  const id = iq.related('labels').run();
});
