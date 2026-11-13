const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../app');

test('health route returns the committed response shape', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: { status: 'ok' },
  });
});

test('Swagger UI is available at the documented path', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api-docs/swagger-ui-init.js`);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /Dobby Rental Car Booking API/);
});
