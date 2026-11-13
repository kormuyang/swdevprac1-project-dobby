const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const http = require('node:http');
const express = require('express');
const mongoose = require('mongoose');
const test = require('node:test');
const AuthSession = require('../models/AuthSession');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const User = require('../models/User');
const authRouter = require('../routes/auth');

const mongoUri = process.env.TEST_MONGO_URI;
const testSecret = randomUUID();
const previousSecret = process.env.JWT_SECRET;
let server;
let baseUrl;
let createdEmail;
let createdRegistration;

test('auth API persists signup/session, supports login and revokes only the logged out session', async (t) => {
  assert.ok(mongoUri, 'Set TEST_MONGO_URI to a dedicated dobby_test_a replica-set database.');
  const database = new URL(mongoUri).pathname.replace(/^\//, '');
  assert.equal(database, 'dobby_test_a', 'TEST_MONGO_URI must name the dedicated dobby_test_a database');
  const suffix = randomUUID();
  createdEmail = `auth-${suffix}@example.test`;
  createdRegistration = `REG-${suffix}`;
  process.env.JWT_SECRET = testSecret;
  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        const userIds = await User.find({ email: createdEmail }).distinct('_id');
        await AuthSession.deleteMany({ userId: { $in: userIds } });
        const user = await User.findOne({ email: createdEmail }).select('_id providerId');
        if (user?.providerId) {
          await ProviderApplication.deleteMany({ providerId: user.providerId });
          await Provider.deleteOne({ _id: user.providerId });
        }
        await User.deleteOne({ email: createdEmail });
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

  await mongoose.connect(mongoUri);
  await Promise.all([User, Provider, ProviderApplication, AuthSession].map((Model) => Model.createIndexes()));
  const app = express();
  app.use('/api/v1/auth', authRouter);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/auth`;

  const companyResponse = await fetch(`${baseUrl}/register-company`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Synthetic Rental',
      telephone: '+66123456789',
      email: createdEmail,
      password: 'integration-pass',
      businessRegistrationNumber: createdRegistration,
      profile: {
        legalName: 'Synthetic Rental Ltd',
        registeredAddress: '1 Test Road',
        telephone: '+66123456789',
        contactEmail: `contact-${suffix}@example.test`,
        documentUrl: 'https://example.test/document.pdf',
      },
    }),
  });
  assert.equal(companyResponse.status, 201);
  const company = await companyResponse.json();
  assert.equal(company.success, true);
  assert.equal(company.data.user.role, 'company');
  const provider = await Provider.findById(company.data.user.providerId);
  const application = await ProviderApplication.findById(provider.latestApplicationId);
  assert.equal(provider.representativeId.toString(), company.data.user.id);
  assert.equal(application.providerId.toString(), provider.id);
  assert.equal(application.version, 1);
  assert.equal(application.status, 'pending');
  assert.equal(await AuthSession.countDocuments({ userId: company.data.user.id }), 1);

  const duplicateEmail = `duplicate-${suffix}@example.test`;
  const duplicateResponse = await fetch(`${baseUrl}/register-company`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Rental',
      telephone: '+66123456789',
      email: duplicateEmail,
      password: 'integration-pass',
      businessRegistrationNumber: createdRegistration,
      profile: {
        legalName: 'Duplicate Rental Ltd',
        registeredAddress: '2 Test Road',
        telephone: '+66123456789',
        contactEmail: `duplicate-contact-${suffix}@example.test`,
        documentUrl: 'https://example.test/duplicate.pdf',
      },
    }),
  });
  assert.equal(duplicateResponse.status, 409);
  assert.equal(await User.countDocuments({ email: duplicateEmail }), 0);
  assert.equal(await ProviderApplication.countDocuments({ businessRegistrationNumber: createdRegistration }), 1);

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: createdEmail, password: 'integration-pass' }),
  });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  const beforeLogout = await fetch(`${baseUrl}/me`, { headers: { authorization: `Bearer ${login.data.token}` } });
  assert.equal(beforeLogout.status, 200);
  const firstSessionBefore = await fetch(`${baseUrl}/me`, {
    headers: { authorization: `Bearer ${company.data.token}` },
  });
  assert.equal(firstSessionBefore.status, 200);
  const logoutResponse = await fetch(`${baseUrl}/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${login.data.token}` },
  });
  assert.equal(logoutResponse.status, 200);
  const afterLogout = await fetch(`${baseUrl}/me`, { headers: { authorization: `Bearer ${login.data.token}` } });
  assert.equal(afterLogout.status, 401);
  const firstSessionAfter = await fetch(`${baseUrl}/me`, {
    headers: { authorization: `Bearer ${company.data.token}` },
  });
  assert.equal(firstSessionAfter.status, 200);
});
