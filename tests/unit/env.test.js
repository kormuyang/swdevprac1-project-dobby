const test = require('node:test');
const assert = require('node:assert/strict');

const { getConfig } = require('../../config/env');

test('getConfig returns validated application settings', () => {
  assert.deepEqual(getConfig({
    NODE_ENV: 'test',
    PORT: '5003',
    MONGO_URI: 'mongodb://localhost/dobby_test',
  }), {
    nodeEnv: 'test',
    port: 5003,
    mongoUri: 'mongodb://localhost/dobby_test',
  });
});

test('getConfig rejects missing database configuration', () => {
  assert.throws(() => getConfig({}), /MONGO_URI is required/);
});

test('getConfig rejects invalid ports', () => {
  assert.throws(() => getConfig({ MONGO_URI: 'mongodb://localhost/test', PORT: '70000' }), /PORT must be/);
});
