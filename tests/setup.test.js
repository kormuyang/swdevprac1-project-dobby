const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const seedScript = path.join(root, 'scripts', 'seed.js');
const resetScript = path.join(root, 'scripts', 'reset-test-db.js');

function runScript(script, values = {}) {
  const env = {
    ...process.env,
    DOTENV_CONFIG_PATH: '/dev/null',
    MONGO_URI: '',
    TEST_MONGO_URI: '',
    ALLOW_TEST_DB_RESET: '',
    SEED_ADMIN_EMAIL: '',
    SEED_ADMIN_PASSWORD: '',
    SEED_FIXTURE_PASSWORD: '',
    ...values,
  };
  return spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8', timeout: 5000 });
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
  const result = runScript(seedScript, { MONGO_URI: 'mongodb://127.0.0.1:27017/dobby_dev_a' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set SEED_ADMIN_EMAIL/);
});

test('reset requires the dedicated test database and explicit reset flag before connecting', () => {
  const missing = runScript(resetScript, { ALLOW_TEST_DB_RESET: 'true' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /TEST_MONGO_URI must explicitly name/);

  const wrongDatabase = runScript(resetScript, {
    TEST_MONGO_URI: 'mongodb://127.0.0.1:27017/dobby_dev_a',
    ALLOW_TEST_DB_RESET: 'true',
  });
  assert.equal(wrongDatabase.status, 1);
  assert.match(wrongDatabase.stderr, /TEST_MONGO_URI must explicitly name/);

  const noFlag = runScript(resetScript, { TEST_MONGO_URI: 'mongodb://127.0.0.1:27017/dobby_test_a' });
  assert.equal(noFlag.status, 1);
  assert.match(noFlag.stderr, /ALLOW_TEST_DB_RESET=true/);
});
