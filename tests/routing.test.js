const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const auth = require('../middleware/auth');
const { paths } = require('../docs/contracts/openapi.json');

test('resource routers preserve documented handlers and role access without protecting public paths', async (t) => {
  // Keep real route registration and authorize(), but avoid sessions and business writes.
  t.mock.method(auth, 'protect', (options = {}) => (req, res, next) => {
    const role = req.get('x-test-role');
    if (!role) {
      return res.status(401).json({ success: false });
    }
    if (req.get('x-test-suspended') && !options.allowSuspended) {
      return res.status(403).json({ success: false });
    }
    req.actor = { role };
    return next();
  });
  for (const name of [
    'authValidation',
    'providersValidation',
    'vehiclesValidation',
    'bookingsValidation',
    'providerLifecycleValidation',
    'approvedProvider',
  ]) {
    const middleware = require(`../middleware/${name}`);
    for (const handler of Object.keys(middleware)) {
      t.mock.method(middleware, handler, (req, res, next) => next());
    }
  }
  for (const name of ['auth', 'providers', 'vehicles', 'bookings', 'providerLifecycle']) {
    const handlers = require(`../controllers/${name}`);
    for (const handler of Object.keys(handlers)) {
      t.mock.method(handlers, handler, (req, res) => res.json({ handler }));
    }
  }
  const app = express();
  app.use('/api/v1/auth', require('../routes/auth'));
  app.use('/api/v1', require('../routes/providers'));
  app.use('/api/v1', require('../routes/vehicles'));
  app.use('/api/v1', require('../routes/bookings'));
  app.use((req, res) => res.status(404).json({ success: false }));
  app.use(require('../middleware/errorHandler').errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function request(method, path, role, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (role) {
      headers['x-test-role'] = role;
    }
    return fetch(base + path, { method: method.toUpperCase(), headers });
  }
  const publicHandlers = {
    listProviders: 'listPublicProviders',
    getProvider: 'getPublicProvider',
    listVehicles: 'listPublicVehicles',
    getVehicle: 'getPublicVehicle',
  };
  let checked = 0;
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation.operationId || path === '/health') {
        continue;
      }
      let roles = null;
      if (path.startsWith('/provider/')) {
        roles = ['provider'];
      } else if (path.startsWith('/admin/')) {
        roles = ['admin'];
      } else if (path.startsWith('/bookings')) {
        roles = method === 'post' ? ['user'] : ['user', 'admin'];
      } else if (['/auth/me', '/auth/logout'].includes(path)) {
        roles = ['user', 'provider', 'admin'];
      }
      const url = path.replace(/\{[^}]+\}/g, '507f1f77bcf86cd799439011');
      for (const role of [undefined, 'user', 'provider', 'admin']) {
        const allowed = roles === null || roles.includes(role);
        let expected = 200;
        if (!allowed) {
          expected = role ? 403 : 401;
        }
        const response = await request(method, url, role);
        assert.equal(response.status, expected, `${method} ${path} as ${role || 'visitor'}`);
        const body = await response.json();
        if (allowed) {
          const handler = Object.hasOwn(publicHandlers, operation.operationId)
            ? publicHandlers[operation.operationId]
            : operation.operationId;
          assert.equal(body.handler, handler);
        }
      }
      checked++;
    }
  }
  assert.equal(checked, 33);
  for (const path of ['/unknown', '/provider/unknown', '/admin/unknown']) {
    const response = await request('GET', path);
    assert.equal(response.status, 404);
    await response.json();
  }
  const suspended = { 'x-test-suspended': 'true' };
  const logout = await request('POST', '/auth/logout', 'provider', suspended);
  assert.equal(logout.status, 200);
  await logout.json();
  const me = await request('GET', '/auth/me', 'provider', suspended);
  assert.equal(me.status, 403);
  await me.json();
});
