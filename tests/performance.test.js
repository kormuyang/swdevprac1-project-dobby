const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { validatePerformanceConfiguration } = require('../scripts/measure-response-times');

test('performance runner rejects missing, malformed and development database names before connecting', () => {
  const previous = process.env.TEST_PERF_MONGO_URI;
  try {
    for (const value of ['', 'invalid', ['mongodb:', '//127.0.0.1:1/dobby_dev_b'].join('')]) {
      process.env.TEST_PERF_MONGO_URI = value;
      assert.throws(validatePerformanceConfiguration, /TEST_PERF_MONGO_URI/);
    }
    assert.equal(mongoose.connection.readyState, 0);
  } finally {
    if (previous === undefined) {
      delete process.env.TEST_PERF_MONGO_URI;
    } else {
      process.env.TEST_PERF_MONGO_URI = previous;
    }
  }
});
