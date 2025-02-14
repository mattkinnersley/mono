import {jwtVerify} from 'jose';
import type {CustomMutatorDefs} from '../../packages/zero-client/src/client/custom.ts';
import {schema} from './schema.ts';
import {must} from '../../packages/shared/src/must.ts';
import type {UpdateValue} from '../../packages/zero/out/zero-client/src/mod.js';
import type {ServerTransaction} from '../../packages/zql/src/mutate/custom.ts';

export const mutators: CustomMutatorDefs<typeof schema> = {
  issue: {
    async create(
      tx,
      {
        id,
        title,
        description,
        creatorID,
      }: {
        id: string;
        title: string;
        description?: string;
        creatorID: string;
      },
    ) {
      if (tx.location === 'server') {
        creatorID = await getUserIDFromToken(tx);
      }

      await tx.mutate.issue.insert({
        id,
        title,
        description: description ?? '',
        created: Date.now(),
        creatorID,
        modified: Date.now(),
        open: true,
        visibility: 'public',
      });
    },

    async update(tx, change: UpdateValue<typeof schema.tables.issue>) {
      if (tx.location === 'server') {
        const [userID, issue] = await Promise.all([
          getUserIDFromToken(tx),
          tx.query.issue.where('id', change.id).one().run(),
        ]);

        if (!issue) {
          throw new Error('issue not found');
        }

        if (issue.creatorID !== userID) {
          const user = await tx.query.user
            .where('id', userID)
            .where('role', 'crew')
            .one()
            .run();
          if (!user) {
            throw new Error('user not authorized to update issue');
          }
        }
      }

      await tx.mutate.issue.update(change);
    },
  },
};

async function verifyToken(tx: ServerTransaction<typeof schema, unknown>) {
  return (
    await jwtVerify(
      must(tx.token, 'user must be logged in for this operation'),
      new TextEncoder().encode(
        must(process.env.ZERO_AUTH_SECRET, 'no secret set to verify the JWT'),
      ),
    )
  ).payload;
}

async function getUserIDFromToken(
  tx: ServerTransaction<typeof schema, unknown>,
) {
  return await must(
    (await verifyToken(tx)).sub,
    'user must be logged in for this operation',
  );
}
