const AppError = require('../utils/AppError');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const express = require('express');
const auth = require('../middleware/auth');
const Provider = require('../models/Provider');
const vehicles = require('../services/vehicles');
const { vehicleInput } = require('./fixtures/rentals');

test('routes retain middleware validation and permission order with synthetic actors', async (t) => {
  const id = '507f1f77bcf86cd799439011';
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomUUID();
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });
  // Authentication itself is covered separately. These requests exercise real
  // routes/controllers without a database, using explicit synthetic actors.
  t.mock.method(auth, 'protect', () => (req, res, next) => {
    const role = req.get('x-test-role');
    if (!role) {
      return res.status(401).json({ success: false, message: 'Authentication is required.' });
    }
    req.actor = { userId: id, providerId: role === 'provider' ? id : null, role };
    return next();
  });
  let approved = true;
  t.mock.method(Provider, 'findOne', () => ({
    session: async () => (approved ? { _id: id, status: 'approved' } : null),
  }));
  const app = express();
  app.set('query parser', 'extended');
  app.use(express.json());
  app.use('/auth', require('../routes/auth'));
  app.use('/', require('../routes/providers'));
  app.use('/', require('../routes/vehicles'));
  app.use('/', require('../routes/bookings'));
  app.use(require('../middleware/errorHandler').errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, path, role, body) {
    const headers = {};
    if (role) {
      headers['x-test-role'] = role;
    }
    const options = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${base}${path}`, options);
    return { status: response.status, body: await response.json() };
  }
  const invalidRequests = [
    ['POST', '/auth/register?extra=1', null, {}, /Query parameters/],
    ['POST', '/auth/register', null, {}, /email/],
    ['POST', '/auth/register-provider', null, {}, /email/],
    [
      'POST',
      '/auth/login',
      null,
      { email: { $ne: null }, password: 'synthetic-password' },
      /email/,
    ],
    ['GET', '/auth/me?extra=1', 'user', undefined, /Query parameters/],
    ['POST', '/auth/logout', 'user', {}, /does not accept a body/],
    ['GET', '/providers?page=0', null, undefined, /page/],
    ['GET', '/providers/invalid', null, undefined, /providerId/],
    ['GET', '/vehicles?minSeats[$gt]=1', null, undefined, /minSeats/],
    ['GET', '/vehicles?startDate=2030-01-01', null, undefined, /date/],
    ['GET', '/vehicles/invalid?extra=1', null, undefined, /Query parameters/],
    ['POST', '/bookings', 'user', { vehicleId: id, state: 'cancelled' }, /Unknown request field/],
    ['PATCH', '/bookings/invalid', 'user', {}, /bookingId/],
    ['DELETE', '/bookings/invalid', 'user', {}, /does not accept a body/],
    ['GET', `/bookings?userId=${id}`, 'user', undefined, /Unknown query/],
    ['GET', '/provider/profile?extra=1', 'provider', undefined, /Query parameters/],
    ['GET', '/provider/applications?limit=0', 'provider', undefined, /limit/],
    ['GET', '/provider/applications/invalid', 'provider', undefined, /applicationId/],
    ['POST', '/provider/applications', 'provider', {}, /legalName/],
    ['GET', '/admin/providers?status=other', 'admin', undefined, /status/],
    ['GET', '/admin/providers/invalid', 'admin', undefined, /providerId/],
    ['GET', '/admin/applications?providerId=invalid', 'admin', undefined, /providerId/],
    ['GET', '/admin/applications/invalid', 'admin', undefined, /applicationId/],
    ['POST', '/admin/providers/invalid/suspend', 'admin', { reason: 'Test' }, /providerId/],
    ['POST', `/admin/providers/${id}/suspend`, 'admin', { reason: ' ' }, /reason/],
    [
      'POST',
      `/admin/providers/${id}/reactivate`,
      'admin',
      { resolutionNote: ' ' },
      /resolutionNote/,
    ],
    ['POST', `/admin/applications/${id}/review`, 'admin', { decision: 'reject' }, /reason/],
    ['GET', '/provider/vehicles?isActive=other', 'provider', undefined, /isActive/],
    ['POST', '/provider/vehicles', 'provider', { providerId: id }, /Unknown request field/],
    ['GET', '/provider/vehicles/invalid', 'provider', undefined, /vehicleId/],
    ['PATCH', `/provider/vehicles/${id}`, 'provider', { vin: 'CHANGED' }, /Unknown request field/],
    ['PATCH', `/provider/vehicles/${id}/availability`, 'provider', {}, /date/],
    ['PATCH', `/provider/vehicles/${id}/activation`, 'provider', { isActive: 'true' }, /isActive/],
    ['GET', '/provider/bookings?status=other', 'provider', undefined, /status/],
    ['GET', '/provider/bookings/invalid', 'provider', undefined, /bookingId/],
  ];
  for (const [method, path, role, body, message] of invalidRequests) {
    const result = await request(method, path, role, body);
    assert.equal(result.status, 400, `${method} ${path}`);
    assert.equal(result.body.success, false);
    assert.match(result.body.message, message, `${method} ${path}`);
    assert.deepEqual(Object.keys(result.body).sort(), ['message', 'success']);
  }
  assert.equal((await request('POST', '/bookings', null, {})).status, 401);
  assert.equal((await request('POST', '/bookings', 'provider', {})).status, 403);

  t.mock.method(vehicles, 'createVehicle', async (input, actor) => {
    assert.equal(input.vin, 'SYNTHETIC-VIN-001');
    assert.equal(input.providerId, undefined);
    assert.equal(actor.role, 'provider');
    return {
      ...input,
      _id: id,
      providerId: actor.providerId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  const { providerId, ...body } = vehicleInput({ vin: ' synthetic-vin-001 ' });
  const created = await request('POST', '/provider/vehicles', 'provider', body);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.vin, 'SYNTHETIC-VIN-001');
  assert.equal(created.body.data.providerId, id);

  t.mock.method(vehicles, 'createVehicle', async () => {
    throw new AppError(409, 'A vehicle with this VIN already exists.');
  });
  const conflict = await request('POST', '/provider/vehicles', 'provider', body);
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.body, {
    success: false,
    message: 'A vehicle with this VIN already exists.',
  });

  t.mock.method(vehicles, 'createVehicle', async () => {
    throw new Error('Synthetic internal database diagnostic');
  });
  const failed = await request('POST', '/provider/vehicles', 'provider', body);
  assert.equal(failed.status, 500);
  assert.deepEqual(failed.body, {
    success: false,
    message: 'The request could not be completed.',
  });

  approved = false;
  for (const [method, path, input] of [
    ['GET', '/provider/vehicles?isActive=other'],
    ['POST', '/provider/vehicles', {}],
    ['GET', '/provider/vehicles/invalid'],
    ['PATCH', '/provider/vehicles/invalid', {}],
    ['PATCH', '/provider/vehicles/invalid/availability', {}],
    ['PATCH', '/provider/vehicles/invalid/activation', {}],
    ['GET', '/provider/bookings?status=other'],
    ['GET', '/provider/bookings/invalid'],
  ]) {
    const denied = await request(method, path, 'provider', input);
    assert.equal(denied.status, 403, `${method} ${path}`);
    assert.deepEqual(denied.body, {
      success: false,
      message: 'An approved provider account is required.',
    });
  }
});
