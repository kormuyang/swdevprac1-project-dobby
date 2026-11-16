const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
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
  assert.equal(requests, 36);
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

test('demo CLI loads its selected environment file before validating configuration', (t) => {
  const directory = fs.mkdtempSync(path.join(__dirname, 'fixtures', '.demo-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const envFile = path.join(directory, 'synthetic.env');
  fs.writeFileSync(
    envFile,
    'SEED_ADMIN_EMAIL=admin@example.test\nSEED_ADMIN_PASSWORD=synthetic-password\nDEMO_BASE_URL=https://example.test/api/v1\n',
  );
  const env = { ...process.env, DOTENV_CONFIG_PATH: envFile };
  delete env.SEED_ADMIN_EMAIL;
  delete env.SEED_ADMIN_PASSWORD;
  delete env.DEMO_BASE_URL;
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, '..', 'scripts', 'test-demo.js')],
    {
      env,
      encoding: 'utf8',
      timeout: 10000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DEMO_BASE_URL must use a local host/);
  assert.doesNotMatch(result.stderr, /Set SEED_ADMIN_EMAIL/);
});

test('Postman Runner setup generates fresh Bangkok dates and keeps values run-local', () => {
  const collection = require('../postman/dobby.postman_collection.json');
  const setup = collection.item[0].item[0].event.find((event) => event.listen === 'prerequest');
  const environment = new Map();
  const local = new Map([
    ['adminEmail', 'admin@example.test'],
    ['adminPassword', 'synthetic-password'],
  ]);
  let guid = 0;
  const pm = {
    environment: { get: (key) => environment.get(key) },
    variables: {
      get: (key) => local.get(key),
      set: (key, value) => local.set(key, value),
      replaceIn: () => `synthetic-guid-${++guid}`,
    },
  };
  class BangkokBoundaryDate extends Date {
    static now() {
      return Date.parse('2026-11-15T18:30:00Z');
    }
  }
  setup.script.exec.forEach((line) => assert.doesNotMatch(line, /console\./));
  const script = new Script(setup.script.exec.join('\n'));
  script.runInNewContext({ pm, Date: BangkokBoundaryDate });
  assert.equal(local.get('today'), '2026-11-16');
  assert.equal(local.get('startDate'), '2026-11-21');
  assert.equal(local.get('dueDate'), '2026-11-23');
  assert.equal(local.get('adminEditStart'), '2026-11-26');
  assert.equal(local.get('adminEditDue'), '2026-11-27');
  assert.equal(local.get('adminToken'), '');
  assert.equal(environment.size, 0);
  const firstEmail = local.get('customerEmail');
  local.set('bookingId', 'old-run-booking');
  script.runInNewContext({ pm, Date: BangkokBoundaryDate });
  assert.notEqual(local.get('customerEmail'), firstEmail);
  assert.equal(local.get('bookingId'), '');
  environment.set('runId', 'newman-synthetic-run');
  environment.set('customerPassword', 'synthetic-newman-password');
  script.runInNewContext({ pm, Date: BangkokBoundaryDate });
  assert.equal(local.get('runId'), 'newman-synthetic-run');
  assert.equal(local.get('customerPassword'), 'synthetic-newman-password');
});

test('Postman Runner guards skip unsafe targets and missing administrator inputs', () => {
  const collection = require('../postman/dobby.postman_collection.json');
  const guard = new Script(collection.event[0].script.exec.join('\n'));
  for (const baseUrl of [
    'https://example.test/api/v1',
    'http://user:password@localhost/api/v1',
    'http://localhost:5003/api/v1?redirect=1',
    'http://localhost:99999/api/v1',
  ]) {
    let skipped = false;
    let next = 'unchanged';
    const pm = {
      variables: { get: () => baseUrl },
      execution: {
        skipRequest: () => {
          skipped = true;
        },
        setNextRequest: (value) => {
          next = value;
        },
      },
    };
    assert.throws(() => guard.runInNewContext({ pm }), /loopback API URL/);
    assert.equal(skipped, true);
    assert.equal(next, null);
  }
  let skipped = false;
  const setup = collection.item[0].item[0].event.find((event) => event.listen === 'prerequest');
  assert.throws(
    () =>
      new Script(setup.script.exec.join('\n')).runInNewContext({
        pm: {
          variables: { get: () => undefined },
          execution: {
            skipRequest: () => {
              skipped = true;
            },
            setNextRequest: () => {},
          },
        },
      }),
    /enter adminEmail\/adminPassword/,
  );
  assert.equal(skipped, true);
});

test('Postman import template has example admin credentials and setup scripts parse', () => {
  const collection = require('../postman/dobby.postman_collection.json');
  const environment = require('../postman/dobby-local.postman_environment.json');
  assert.equal(environment._postman_variable_scope, 'environment');
  assert.equal(environment.values.find((v) => v.key === 'adminEmail').value, 'admin@example.test');
  assert.equal(environment.values.find((v) => v.key === 'adminPassword').value, 'admin1234');
  for (const event of collection.event) {
    new Script(event.script.exec.join('\n'));
  }
  const serialized = JSON.stringify(collection);
  assert.doesNotMatch(serialized, /pm\.environment\.(set|unset)/);
  assert.equal(collection.item.flatMap((folder) => folder.item).length, 36);
});

test('Postman run-local tokens chain through the installed Newman sandbox', async (t) => {
  const http = require('node:http');
  const newman = require('newman');
  const collection = structuredClone(require('../postman/dobby.postman_collection.json'));
  collection.item = collection.item.slice(0, 2);
  collection.item.push({
    name: 'Synthetic protected probe',
    item: [
      {
        name: 'Read current user',
        request: {
          method: 'GET',
          url: '{{baseUrl}}/auth/me',
          header: [{ key: 'Authorization', value: 'Bearer {{customerToken}}' }],
        },
      },
    ],
  });
  let customerEmail;
  const received = [];
  const server = http.createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
    }
    received.push({ method: req.method, url: req.url, authorization: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/v1/auth/login') {
      res.end(JSON.stringify({ success: true, data: { token: 'synthetic-customer-token' } }));
    } else if (req.url === '/api/v1/auth/register') {
      const body = JSON.parse(raw);
      if (body.password === 'short') {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Invalid password.' }));
        return;
      }
      customerEmail = body.email;
      res.statusCode = 201;
      res.end(
        JSON.stringify({
          success: true,
          data: {
            token: 'synthetic-customer-token',
            user: { id: 'synthetic-customer-id', role: 'user', email: customerEmail },
          },
        }),
      );
    } else if (req.url === '/api/v1/auth/me') {
      res.end(JSON.stringify({ success: true, data: { email: customerEmail } }));
    } else {
      res.statusCode = 404;
      res.end('{}');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const values = [
    { key: 'baseUrl', value: `http://127.0.0.1:${server.address().port}/api/v1` },
    { key: 'adminEmail', value: 'admin@example.test' },
    { key: 'adminPassword', value: 'synthetic-password' },
  ];
  const summary = await new Promise((resolve, reject) =>
    newman.run(
      {
        collection,
        environment: { name: 'Synthetic local HTTP fixture', values },
        reporters: [],
        silent: true,
        bail: true,
        timeoutRequest: 5000,
        timeoutScript: 5000,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
  assert.equal(summary.run.failures.length, 0);
  assert.equal(summary.run.stats.requests.total, 4);
  assert.ok(customerEmail.endsWith('@example.test'));
  assert.deepEqual(
    received.map((r) => r.url),
    ['/api/v1/auth/register', '/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/me'],
  );
  assert.equal(received[3].authorization, 'Bearer synthetic-customer-token');
  assert.equal(summary.environment.has('customerToken'), false);
  assert.equal(summary.environment.has('customerPassword'), false);
});

test('required twelve sections precede every extra-credit request', () => {
  const collection = require('../postman/dobby.postman_collection.json');
  const names = [
    'User Registration + Validation Check',
    'User Log-in',
    'User View Product',
    'User Create Booking + Check Create Condition',
    'User View Own Booking',
    'User Edit Own Booking',
    'User Delete Own Booking',
    'User Log-out',
    'Admin Log-in',
    'Admin View Any Booking',
    'Admin Edit Any Booking',
    'Admin Delete Any Booking',
  ];
  assert.deepEqual(
    collection.item.slice(0, 12).map((f) => f.name.slice(3)),
    names,
  );
  const required = collection.item.slice(0, 12).flatMap((f) => f.item);
  const adminLogin = required.findIndex((i) => i.name === 'Admin log-in');
  assert.equal(
    required.slice(0, adminLogin).some((i) => JSON.stringify(i.request).includes('{{adminToken}}')),
    false,
  );
  assert.equal(
    collection.item.slice(12).every((f) => f.name.includes('Extra Credits')),
    true,
  );
  const creation = collection.item[3].item;
  assert.equal(creation.length, 3);
  assert.match(creation[1].event[0].script.exec.join('\n'), /409/);
  assert.match(collection.item[6].item[0].request.url, /bookingId/);
  assert.match(collection.item[11].item[0].request.url, /adminBookingId/);
});
