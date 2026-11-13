const test = require('node:test');
const assert = require('node:assert/strict');

const mongoose = require('mongoose');
const { runTransaction } = require('../../services/transactions');

function createSession({ commit } = {}) {
  let active = false;
  return {
    startTransaction() {
      active = true;
    },
    async commitTransaction() {
      if (commit) {
        await commit();
      }
      active = false;
    },
    async abortTransaction() {
      active = false;
    },
    async endSession() {},
    inTransaction() {
      return active;
    },
  };
}

test('runTransaction passes one session and Bangkok calendar date to its work', async (t) => {
  const session = createSession();
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => session;
  t.after(() => {
    mongoose.startSession = originalStartSession;
  });

  const fixedNow = new Date('2026-01-01T18:00:00.000Z');
  const result = await runTransaction(async (context) => {
    assert.equal(context.session, session);
    assert.equal(context.now, fixedNow);
    assert.equal(context.today, '2026-01-02');
    return 'saved';
  }, { clock: { now: () => fixedNow } });

  assert.equal(result, 'saved');
});

test('runTransaction retries transient work failures up to the bounded attempt count', async (t) => {
  const session = createSession();
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => session;
  t.after(() => {
    mongoose.startSession = originalStartSession;
  });

  let attempts = 0;
  const result = await runTransaction(async () => {
    attempts += 1;
    if (attempts === 1) {
      const error = new Error('transient');
      error.hasErrorLabel = (label) => label === 'TransientTransactionError';
      throw error;
    }
    return 'saved';
  });

  assert.equal(attempts, 2);
  assert.equal(result, 'saved');
});

test('runTransaction retries an unknown commit result without rerunning work', async (t) => {
  let commits = 0;
  const session = createSession({
    commit: async () => {
      commits += 1;
      if (commits === 1) {
        const error = new Error('unknown commit result');
        error.hasErrorLabel = (label) => label === 'UnknownTransactionCommitResult';
        throw error;
      }
    },
  });
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async () => session;
  t.after(() => {
    mongoose.startSession = originalStartSession;
  });

  let workCalls = 0;
  await runTransaction(async () => {
    workCalls += 1;
  });

  assert.equal(commits, 2);
  assert.equal(workCalls, 1);
});
