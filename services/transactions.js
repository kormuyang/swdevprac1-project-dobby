const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const MAX_ATTEMPTS = 3;
const TRANSACTION_BUDGET_MS = 2500;

function getBangkokDate(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isTransientTransactionError(error) {
  return typeof error?.hasErrorLabel === 'function'
    && error.hasErrorLabel('TransientTransactionError');
}

function isUnknownCommitResult(error) {
  return typeof error?.hasErrorLabel === 'function'
    && error.hasErrorLabel('UnknownTransactionCommitResult');
}

function makeWriteConflictError() {
  return new ApiError(409, 'WRITE_CONFLICT', 'The operation conflicted with another update. Please retry.');
}

async function commitWithRetry(session, deadline) {
  while (Date.now() < deadline) {
    try {
      await session.commitTransaction();
      return;
    } catch (error) {
      if (!isUnknownCommitResult(error)) {
        throw error;
      }
    }
  }

  throw new ApiError(500, 'INTERNAL_ERROR', 'The transaction commit outcome could not be confirmed.');
}

async function runTransaction(work, { clock = { now: () => new Date() } } = {}) {
  if (typeof work !== 'function') {
    throw new TypeError('runTransaction requires a work function.');
  }
  if (!clock || typeof clock.now !== 'function') {
    throw new TypeError('clock.now must be a function.');
  }

  const startedAt = Date.now();
  const deadline = startedAt + TRANSACTION_BUDGET_MS;
  const session = await mongoose.startSession();

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (Date.now() >= deadline) {
        break;
      }

      const now = clock.now();
      if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError('clock.now must return a valid Date.');
      }

      session.startTransaction();
      try {
        const result = await work({ session, now, today: getBangkokDate(now) });
        await commitWithRetry(session, deadline);
        return result;
      } catch (error) {
        if (session.inTransaction()) {
          await session.abortTransaction().catch(() => {});
        }

        if (!isTransientTransactionError(error)) {
          throw error;
        }
      }
    }

    throw makeWriteConflictError();
  } finally {
    await session.endSession();
  }
}

module.exports = { runTransaction };
