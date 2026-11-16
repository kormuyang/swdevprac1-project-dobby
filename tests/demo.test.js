const assert = require('node:assert/strict');
const test = require('node:test');
const { Script } = require('node:vm');
const { localBaseUrl, runDemo } = require('../scripts/test-demo');

test('Postman requests match OpenAPI routes and embedded scripts parse', () => {
  const collection = require('../postman/dobby.postman_collection.json');
  const { paths } = require('../docs/contracts/openapi.json');
  let requests = 0;
  function checkItems(items) {
    for (const item of items) {
      if (item.item) {
        checkItems(item.item);
      }
      if (item.request) {
        const route = item.request.url.replace('{{baseUrl}}', '').split('?')[0];
        const method = item.request.method.toLowerCase();
        const matched = Object.entries(paths).some(([path, operations]) => {
          const pattern = path.replace(/\{[^}]+\}/g, '[^/]+');
          return operations[method] && new RegExp(`^${pattern}$`).test(route);
        });
        assert.ok(matched, `${item.request.method} ${route}`);
        requests++;
      }
      for (const event of item.event || []) {
        new Script(event.script.exec.join('\n'), { filename: item.name });
      }
    }
  }
  checkItems(collection.item);
  assert.ok(requests >= 30);
});

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
