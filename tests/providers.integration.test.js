const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const test = require('node:test');
const AuthSession = require('../models/AuthSession');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const User = require('../models/User');
const companyRoutes = require('../routes/company');
const adminRoutes = require('../routes/adminProviders');

const mongoUri = process.env.TEST_MONGO_URI;
test('provider review and profile versioning persist atomically', async (t) => {
  assert.ok(mongoUri, 'Set TEST_MONGO_URI to a dedicated dobby_test_a replica-set database.');
  assert.equal(new URL(mongoUri).pathname.replace(/^\//, ''), 'dobby_test_a', 'TEST_MONGO_URI must name dobby_test_a.');
  const suffix = randomUUID();
  const companyEmail = `provider-${suffix}@example.test`;
  const adminEmail = `admin-${suffix}@example.test`;
  const secret = randomUUID();
  const previousSecret = process.env.JWT_SECRET;
  let server;
  let providerId;
  let companyId;
  let adminId;
  let companySid;
  let adminSid;

  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        if (providerId) {
          await ProviderApplication.deleteMany({ providerId });
          await Provider.deleteOne({ _id: providerId });
        }
        if (companySid || adminSid) await AuthSession.deleteMany({ sid: { $in: [companySid, adminSid].filter(Boolean) } });
        await User.deleteMany({ _id: { $in: [companyId, adminId].filter(Boolean) } });
      }
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });

  process.env.JWT_SECRET = secret;
  await mongoose.connect(mongoUri);
  await Promise.all([User, Provider, ProviderApplication, AuthSession].map((Model) => Model.createIndexes()));

  const company = await User.create({ name: 'Synthetic Company', telephone: '12345678', email: companyEmail, passwordHash: 'integration-password', role: 'company' });
  companyId = company._id;
  const admin = await User.create({ name: 'Synthetic Admin', telephone: '12345678', email: adminEmail, passwordHash: 'integration-password', role: 'admin' });
  adminId = admin._id;
  providerId = new mongoose.Types.ObjectId();
  company.providerId = providerId;
  await company.save();
  const appId = new mongoose.Types.ObjectId();
  const provider = await Provider.create({
    _id: providerId, representativeId: companyId, businessRegistrationNumber: `REG-${suffix}`,
    status: 'pending', latestApplicationId: appId, applicationSequence: 1,
  });
  await ProviderApplication.create({ _id: appId, providerId, version: 1, businessRegistrationNumber: provider.businessRegistrationNumber, profile: makeProfile(suffix, 'v1'), status: 'pending' });
  companySid = randomUUID();
  adminSid = randomUUID();
  await AuthSession.create([
    { sid: companySid, userId: companyId, expiresAt: new Date(Date.now() + 60_000) },
    { sid: adminSid, userId: adminId, expiresAt: new Date(Date.now() + 60_000) },
  ]);
  const app = express();
  app.use('/api/v1/company', companyRoutes);
  app.use('/api/v1/admin', adminRoutes);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const token = (userId, sid) => jwt.sign({ sid }, secret, { algorithm: 'HS256', subject: String(userId), expiresIn: '1m' });
  const companyHeaders = { authorization: `Bearer ${token(companyId, companySid)}`, 'content-type': 'application/json' };
  const adminHeaders = { authorization: `Bearer ${token(adminId, adminSid)}`, 'content-type': 'application/json' };

  const forbidden = await fetch(`${base}/admin/applications/${appId}/review`, { method: 'POST', headers: companyHeaders, body: JSON.stringify({ decision: 'approve' }) });
  assert.equal(forbidden.status, 403);
  const history = await fetch(`${base}/company/applications`, { headers: companyHeaders });
  assert.equal(history.status, 200);
  assert.equal((await history.json()).data[0].version, 1);

  const rejected = await fetch(`${base}/admin/applications/${appId}/review`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ decision: 'reject', reason: 'Update document' }) });
  assert.equal(rejected.status, 200);
  const revisionBody = JSON.stringify(makeProfile(suffix, 'v2'));
  const submissions = await Promise.all([0, 1].map(() => fetch(`${base}/company/applications`, { method: 'POST', headers: companyHeaders, body: revisionBody })));
  assert.deepEqual(submissions.map((response) => response.status).sort(), [201, 409]);
  const successful = await submissions.find((response) => response.status === 201).json();
  const secondId = successful.data.id;
  assert.equal(successful.data.version, 2);
  const approved = await fetch(`${base}/admin/applications/${secondId}/review`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ decision: 'approve' }) });
  assert.equal(approved.status, 200);
  let persisted = await Provider.findById(providerId);
  assert.equal(String(persisted.approvedApplicationId), secondId);
  assert.equal(persisted.status, 'approved');

  const thirdSubmit = await fetch(`${base}/company/applications`, { method: 'POST', headers: companyHeaders, body: JSON.stringify(makeProfile(suffix, 'v3')) });
  assert.equal(thirdSubmit.status, 201);
  const third = await thirdSubmit.json();
  await Provider.updateOne({ _id: providerId }, { $set: { status: 'suspended' } });
  const approvedWhileSuspended = await fetch(`${base}/admin/applications/${third.data.id}/review`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ decision: 'approve' }) });
  assert.equal(approvedWhileSuspended.status, 200);
  persisted = await Provider.findById(providerId);
  assert.equal(persisted.status, 'suspended');
  assert.equal(String(persisted.approvedApplicationId), third.data.id);
});

function makeProfile(suffix, version) {
  return {
    legalName: `Synthetic Rental ${version}`,
    registeredAddress: '1 Test Road',
    telephone: '12345678',
    contactEmail: `contact-${suffix}@example.test`,
    documentUrl: `https://example.test/${version}.pdf`,
  };
}
