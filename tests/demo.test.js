const assert = require('node:assert/strict');
const test = require('node:test');
const { localBaseUrl, runDemo } = require('../scripts/test-demo');

test('demo refuses remote targets, URL credentials and query parameters', () => {
  const previous = process.env.DEMO_BASE_URL;
  try {
    for (const value of [
      'https://example.test/api/v1',
      'http://user:password@localhost/api/v1',
      'http://localhost/api/v1?redirect=1',
    ]) {
      process.env.DEMO_BASE_URL = value;
      assert.throws(localBaseUrl, /DEMO_BASE_URL/);
    }
    process.env.DEMO_BASE_URL = 'http://127.0.0.1:5003/api/v1/';
    assert.equal(localBaseUrl(), 'http://127.0.0.1:5003/api/v1');
  } finally {
    if (previous === undefined) {
      delete process.env.DEMO_BASE_URL;
    } else {
      process.env.DEMO_BASE_URL = previous;
    }
  }
});

test('demo requires locally supplied admin credentials before requests', async () => {
  const previous = process.env.SEED_ADMIN_PASSWORD;
  delete process.env.SEED_ADMIN_PASSWORD;
  try {
    await assert.rejects(runDemo(), /Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD/);
  } finally {
    if (previous !== undefined) {
      process.env.SEED_ADMIN_PASSWORD = previous;
    }
  }
});
