const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Provider = require('../../models/Provider');
const ProviderApplication = require('../../models/ProviderApplication');
const AuthSession = require('../../models/AuthSession');
const Vehicle = require('../../models/Vehicle');
const Booking = require('../../models/Booking');
const { vehicleInput } = require('./rentals');
const { todayBangkok } = require('../../utils/dates');

function addDays(date, days) {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

async function apiFixture(t, extraRoutes = []) {
  let parsed;
  try {
    parsed = new URL(process.env.TEST_MONGO_URI_B);
  } catch {
    throw new Error('Set TEST_MONGO_URI_B to dedicated dobby_test_b.');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || parsed.pathname !== '/dobby_test_b') {
    throw new Error('TEST_MONGO_URI_B must name dedicated dobby_test_b.');
  }
  const previousSecret = process.env.JWT_SECRET;
  const secret = randomUUID();
  process.env.JWT_SECRET = secret;
  const users = [];
  const providers = [];
  let server;
  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await Booking.deleteMany({ providerId: { $in: providers } });
        await Vehicle.deleteMany({ providerId: { $in: providers } });
        await ProviderApplication.deleteMany({ providerId: { $in: providers } });
        await Provider.deleteMany({ _id: { $in: providers } });
        await AuthSession.deleteMany({ userId: { $in: users } });
        await User.deleteMany({ _id: { $in: users } });
      }
    } finally {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await mongoose.disconnect();
      if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = previousSecret;
      }
    }
  });
  await mongoose.connect(process.env.TEST_MONGO_URI_B);
  for (const Model of [User, Provider, ProviderApplication, AuthSession, Vehicle, Booking]) {
    await Model.createIndexes();
  }
  async function account(role, status = null) {
    const userId = new mongoose.Types.ObjectId();
    users.push(userId);
    const input = { _id: userId, name: 'Synthetic Account', email: `${randomUUID()}@example.test`,
      telephone: '123456789', passwordHash: 'synthetic-password', role };
    let providerId = null;
    if (role === 'company') {
      providerId = new mongoose.Types.ObjectId();
      providers.push(providerId);
      input.providerId = providerId;
    }
    const user = await User.create(input);
    if (providerId) {
      const applicationId = new mongoose.Types.ObjectId();
      const registration = randomUUID();
      await ProviderApplication.create({ _id: applicationId, providerId, version: 1,
        businessRegistrationNumber: registration, status: status === 'approved' ? 'approved' : 'pending',
        profile: { legalName: `Synthetic ${providerId}`, registeredAddress: 'Test Road', telephone: '123456789',
          contactEmail: 'contact@example.test', documentUrl: 'https://example.test/private-document' } });
      await Provider.create({ _id: providerId, representativeId: userId, businessRegistrationNumber: registration,
        status, latestApplicationId: applicationId, approvedApplicationId: status === 'approved' ? applicationId : null });
    }
    const sid = randomUUID();
    await AuthSession.create({ sid, userId, expiresAt: new Date(Date.now() + 300_000) });
    const token = jwt.sign({ sid }, secret, { subject: String(userId), algorithm: 'HS256', expiresIn: '5m' });
    return { user, providerId, token, actor: { userId: String(userId), providerId: providerId ? String(providerId) : null, role, sessionId: sid } };
  }
  const admin = await account('admin');
  const customer = await account('user');
  const otherCustomer = await account('user');
  const company = await account('company', 'approved');
  const otherCompany = await account('company', 'approved');
  const pending = await account('company', 'pending');
  const app = express();
  app.set('query parser', 'extended');
  app.use('/api/v1', require('../../routes/publicVehicles'));
  app.use('/api/v1/company/vehicles', require('../../routes/companyVehicles'));
  app.use('/api/v1/auth', require('../../routes/auth'));
  app.use('/api/v1/company', require('../../routes/company'));
  app.use('/api/v1/admin/providers', require('../../routes/providerLifecycle'));
  for (const [route, router] of extraRoutes) {
    app.use(route, router);
  }
  app.use((req, res) => res.status(404).json({ success: false, message: 'Not found.' }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function request(path, options = {}) {
    const { actor, body, ...rest } = options;
    const headers = { ...rest.headers };
    if (actor) {
      headers.authorization = `Bearer ${actor.token}`;
    }
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    const response = await fetch(base + path, { ...rest, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  async function createVehicle(owner = company, changes = {}) {
    const { providerId, ...body } = vehicleInput({ vin: `V-${randomUUID()}`, availableFrom: todayBangkok(new Date()), ...changes });
    const response = await request('/company/vehicles', { method: 'POST', actor: owner, body });
    assert.equal(response.status, 201, 'Synthetic vehicle creation must succeed.');
    return response.body.data;
  }
  return { app, base, request, createVehicle, account, admin, customer, otherCustomer, company, otherCompany, pending,
    today: todayBangkok(new Date()) };
}

module.exports = { apiFixture, addDays };
