import {describe, expect, test, vi} from 'vitest';
import {combinePushes, PusherService, Queue} from './pusher.ts';
import type {Mutation, PushBody} from '../../../../zero-protocol/src/push.ts';
import {createSilentLogContext} from '../../../../shared/src/logging-test-utils.ts';

describe('queue', () => {
  test('a consumer blocks until tasks are available', async () => {
    const queue = new Queue<number>();
    const promise = queue.awaitTasks().then(() => {
      const tasks = queue.drain();
      expect(tasks).toEqual([1]);
    });
    queue.enqueue(1);
    await promise;
  });

  test('drain will get all tasks that were accumulated in the prior tick', async () => {
    const queue = new Queue<number>();
    const promise = queue.awaitTasks().then(() => {
      const tasks = queue.drain();
      expect(tasks).toEqual([1, 2, 3]);
    });
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    await promise;
  });

  test('a consumer is called if tasks are already available', async () => {
    const queue = new Queue<number>();
    queue.enqueue(1);
    const promise = queue.awaitTasks().then(() => {
      const tasks = queue.drain();
      expect(tasks).toEqual([1]);
    });
    await promise;
  });

  test('drain will get all tasks that were accumulated in the prior tick | 2', async () => {
    const queue = new Queue<number>();
    queue.enqueue(1);
    const promise = queue.awaitTasks().then(() => {
      const tasks = queue.drain();
      expect(tasks).toEqual([1, 2, 3]);
    });
    queue.enqueue(2);
    queue.enqueue(3);
    await promise;
  });
});

describe('combine pushes', () => {
  test('empty array', () => {
    const [pushes, terminate] = combinePushes([]);
    expect(pushes).toEqual([]);
    expect(terminate).toBe(false);
  });

  test('same JWT', () => {
    const [pushes, terminate] = combinePushes([
      {
        push: makePush(1),
        jwt: 'a',
      },
      {
        push: makePush(1),
        jwt: 'a',
      },
      {
        push: makePush(1),
        jwt: 'a',
      },
    ]);
    expect(pushes).toHaveLength(1);
    expect(terminate).toBe(false);
    expect(pushes[0].push.mutations).toHaveLength(3);
  });

  test('different JWT groups', () => {
    const [pushes, terminate] = combinePushes([
      {
        push: makePush(1),
        jwt: 'a',
      },
      {
        push: makePush(1),
        jwt: 'a',
      },
      {
        push: makePush(1),
        jwt: 'c',
      },
      {
        push: makePush(1),
        jwt: 'b',
      },
      {
        push: makePush(1),
        jwt: 'b',
      },
      {
        push: makePush(1),
        jwt: 'c',
      },
    ]);
    expect(pushes).toHaveLength(4);
    expect(terminate).toBe(false);
    expect(pushes[0].push.mutations).toHaveLength(2);
    expect(pushes[0].jwt).toBe('a');
    expect(pushes[1].push.mutations).toHaveLength(1);
    expect(pushes[1].jwt).toBe('c');
    expect(pushes[2].push.mutations).toHaveLength(2);
    expect(pushes[2].jwt).toBe('b');
    expect(pushes[3].push.mutations).toHaveLength(1);
    expect(pushes[3].jwt).toBe('c');
  });

  test('stop', () => {
    const [pushes, terminate] = combinePushes(['stop']);
    expect(pushes).toEqual([]);
    expect(terminate).toBe(true);
  });

  test('stop after pushes', () => {
    const [pushes, terminate] = combinePushes([
      {
        push: makePush(1),
        jwt: 'a',
      },
      {
        push: makePush(1),
        jwt: 'a',
      },
      'stop',
    ]);
    expect(pushes).toHaveLength(1);
    expect(terminate).toBe(true);
  });

  test('stop in the middle', () => {
    const [pushes, terminate] = combinePushes([
      {
        push: makePush(1),
        jwt: 'a',
      },
      'stop',
      {
        push: makePush(1),
        jwt: 'a',
      },
    ]);
    expect(pushes).toHaveLength(1);
    expect(terminate).toBe(true);
  });
});

const lc = createSilentLogContext();
describe('pusher service', () => {
  test('the service can be stopped', async () => {
    const pusher = new PusherService(
      lc,
      'cgid',
      'http://exmaple.com',
      undefined,
    );
    let shutDown = false;
    void pusher.run().then(() => {
      shutDown = true;
    });
    await pusher.stop();
    expect(shutDown).toBe(true);
  });

  test('the service set authorization headers', async () => {
    const fetch = (global.fetch = vi.fn());
    fetch.mockResolvedValue({
      ok: true,
    });

    const pusher = new PusherService(
      lc,
      'cgid',
      'http://exmaple.com',
      'api-key',
    );
    void pusher.run();

    pusher.enqueuePush(makePush(1), 'jwt');

    await pusher.stop();

    expect(fetch.mock.calls[0][1]?.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Api-Key': 'api-key',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Authorization': 'Bearer jwt',
    });

    fetch.mockReset();
  });
});

let timestamp = 0;
let id = 0;
function makePush(numMutations: number): PushBody {
  return {
    clientGroupID: 'cgid',
    mutations: Array.from({length: numMutations}, makeMutation),
    pushVersion: 1,
    requestID: 'rid',
    schemaVersion: 1,
    timestamp: ++timestamp,
  };
}

function makeMutation(): Mutation {
  return {
    type: 'custom',
    args: [],
    clientID: 'cid',
    id: ++id,
    name: 'n',
    timestamp: ++timestamp,
  } as const;
}
