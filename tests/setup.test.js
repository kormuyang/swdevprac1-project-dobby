const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const seedScript = path.join(root, 'scripts', 'seed.js');
const resetScript = path.join(root, 'scripts', 'reset-test-db.js');

function runScript(script, values = {}, args = []) {
  const env = {
    ...process.env,
    DOTENV_CONFIG_PATH: '/dev/null',
    MONGO_URI: '',
    ALLOW_TEST_DB_RESET: '',
    SEED_ADMIN_EMAIL: '',
    SEED_ADMIN_PASSWORD: '',
    SEED_FIXTURE_PASSWORD: '',
    ...values,
  };
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 5000,
  });
}

test('seed refuses missing or non-allowlisted database before connecting', () => {
  const missing = runScript(seedScript);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /MONGO_URI must explicitly name/);

  const wrongDatabase = runScript(seedScript, {
    MONGO_URI: 'mongodb://127.0.0.1:27017/dobby_shared',
    SEED_ADMIN_EMAIL: 'admin@example.test',
    SEED_ADMIN_PASSWORD: 'synthetic-password',
    SEED_FIXTURE_PASSWORD: 'synthetic-password',
  });
  assert.equal(wrongDatabase.status, 1);
  assert.match(wrongDatabase.stderr, /MONGO_URI must explicitly name/);
});

test('seed requires locally supplied credentials before connecting', () => {
  const result = runScript(seedScript, { MONGO_URI: 'mongodb://127.0.0.1:27017/dobby' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set SEED_ADMIN_EMAIL/);
});

test('reset requires the shared database name and explicit reset flag before connecting', () => {
  const missing = runScript(resetScript, { ALLOW_TEST_DB_RESET: 'true' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /MONGO_URI must explicitly name/);

  const wrongDatabase = runScript(resetScript, {
    MONGO_URI: 'mongodb://127.0.0.1:27017/other',
    ALLOW_TEST_DB_RESET: 'true',
  });
  assert.equal(wrongDatabase.status, 1);
  assert.match(wrongDatabase.stderr, /MONGO_URI must explicitly name/);

  const noFlag = runScript(resetScript, {
    MONGO_URI: 'mongodb://127.0.0.1:27017/dobby',
  });
  assert.equal(noFlag.status, 1);
  assert.match(noFlag.stderr, /ALLOW_TEST_DB_RESET=true/);
});

test('seed rejects an unusable admin email before connecting', () => {
  const result = runScript(seedScript, {
    MONGO_URI: 'mongodb://127.0.0.1:27017/dobby',
    SEED_ADMIN_EMAIL: 'invalid-email',
    SEED_ADMIN_PASSWORD: 'synthetic-password',
    SEED_FIXTURE_PASSWORD: 'synthetic-password',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SEED_ADMIN_EMAIL must be a valid login email/);
});

test('reset rejects obsolete owner arguments before connecting', () => {
  const result = runScript(resetScript, {}, ['--owner=b']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not accept arguments/);
});

test('global JSON parsing uses safe JSON errors before authentication', async (t) => {
  const express = require('express');
  const app = express();
  app.set('env', 'test');
  app.use(express.json());
  app.post('/echo', (req, res) => res.json({ size: req.body.text.length }));
  app.get('/failure', () => {
    throw new Error('Synthetic internal diagnostic');
  });
  app.use('/', require('../routes/bookings'));
  app.use(require('../middleware/errorHandler').errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'content-type': 'application/json' };

  const accepted = await fetch(`${base}/echo`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: 'a'.repeat(20 * 1024) }),
  });
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { size: 20 * 1024 });

  for (const route of ['/echo', '/bookings', '/unknown']) {
    const malformed = await fetch(`${base}${route}`, { method: 'POST', headers, body: '{' });
    assert.equal(malformed.status, 400);
    assert.match(malformed.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await malformed.json(), {
      success: false,
      message: 'The request body must contain valid JSON.',
    });
  }
  const oversized = await fetch(`${base}/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: 'a'.repeat(100 * 1024) }),
  });
  assert.equal(oversized.status, 413);
  assert.match(oversized.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await oversized.json(), {
    success: false,
    message: 'The request body exceeds the 100 KB limit.',
  });

  const unauthorized = await fetch(`${base}/bookings`, { method: 'POST', headers, body: '{}' });
  assert.equal(unauthorized.status, 401);
  const failure = await fetch(`${base}/failure`);
  assert.equal(failure.status, 500);
  assert.match(failure.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await failure.json(), {
    success: false,
    message: 'The request could not be completed.',
  });
});
