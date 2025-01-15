/**
 * Relationships as secondary.
 */

import {expectTypeOf, test} from 'vitest';
import {table, number, string} from './table-builder.js';
import {relationships} from './relationship-builder.js';
import type {Query} from '../../../zql/src/query/query.js';
import {createSchema} from './schema-builder.js';

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

  const issueRelationships = relationships(issue)
    .many('owner', {
      sourceField: ['ownerId'],
      destField: ['id'],
      destSchema: user,
    })
    .many(
      'labels',
      {
        sourceField: ['id'],
        destField: ['issueId'],
        destSchema: issueLabel,
      },
      {
        sourceField: ['labelId'],
        destField: ['id'],
        destSchema: label,
      },
    )
    .build();

  const userRelationships = relationships(user)
    .many('recruiter', {
      sourceField: ['id'],
      destField: ['recruiterId'],
      destSchema: user,
    })
    .build();

  const labelRelationships = relationships(label)
    .many(
      'issues',
      {
        sourceField: ['id'],
        destField: ['labelId'],
        destSchema: issueLabel,
      },
      {
        sourceField: ['issueId'],
        destField: ['id'],
        destSchema: issue,
      },
    )
    .build();

  const schema = createSchema(
    {user, issue, issueLabel, label},
    {
      userRelationships,
      issueRelationships,
      labelRelationships,
    },
  );

  const q = {} as Query<typeof schema, 'user'>;
  const iq = {} as Query<typeof schema, 'issue'>;
  const r = q
    .related('recruiter', q => q.related('recruiter', q => q.one()).one())
    .run();
  expectTypeOf(r).toEqualTypeOf<{
    readonly id: string;
    readonly name: string;
    readonly recruiterId: number;
    readonly recruiter:
      | {
          readonly id: string;
          readonly name: string;
          readonly recruiterId: number;
          readonly recruiter:
            | {
                readonly id: string;
                readonly name: string;
                readonly recruiterId: number;
              }
            | undefined;
        }
      | undefined;
  }>();

  const id = iq.related('labels').run();
  expectTypeOf(id).toEqualTypeOf<{
    readonly id: string;
    readonly title: string;
    readonly ownerId: number;
    readonly labels: readonly {
      readonly id: number;
      readonly name: string;
    }[];
  }>();

  const lq = {} as Query<typeof schema, 'label'>;
  const ld = lq.related('issues').run();
  expectTypeOf(ld).toEqualTypeOf<{
    readonly id: number;
    readonly name: string;
    readonly issues: readonly {
      readonly id: string;
      readonly title: string;
      readonly ownerId: number;
    }[];
  }>();

  lq.whereExists('issues', q => q.where('title', '=', 'foo')).run();
});
