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
const providerRoutes = require('../routes/providers');

const mongoUri = process.env.TEST_MONGO_URI;
test('provider review and profile versioning persist atomically', async (t) => {
  assert.ok(mongoUri, 'Set TEST_MONGO_URI to a dedicated dobby_test_a replica-set database.');
  assert.equal(
    new URL(mongoUri).pathname.replace(/^\//, ''),
    'dobby_test_a',
    'TEST_MONGO_URI must name dobby_test_a.',
  );
  const suffix = randomUUID();
  const providerEmail = `provider-${suffix}@example.test`;
  const otherProviderEmail = `other-provider-${suffix}@example.test`;
  const adminEmail = `admin-${suffix}@example.test`;
  const secret = randomUUID();
  const previousSecret = process.env.JWT_SECRET;
  let server;
  let providerId;
  let otherProviderId;
  let otherApplicationId;
  let providerUserId;
  let otherProviderUserId;
  let adminId;
  let providerSid;
  let adminSid;

  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        if (providerId) {
          await ProviderApplication.deleteMany({ providerId });
          await Provider.deleteOne({ _id: providerId });
        }
        if (otherProviderId) {
          await ProviderApplication.deleteMany({ providerId: otherProviderId });
          await Provider.deleteOne({ _id: otherProviderId });
        }
        if (providerSid || adminSid)
          await AuthSession.deleteMany({ sid: { $in: [providerSid, adminSid].filter(Boolean) } });
        await User.deleteMany({
          _id: { $in: [providerUserId, otherProviderUserId, adminId].filter(Boolean) },
        });
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
  await Promise.all(
    [User, Provider, ProviderApplication, AuthSession].map((Model) => Model.createIndexes()),
  );

  const providerAccount = await User.create({
    name: 'Synthetic Provider',
    telephone: '12345678',
    email: providerEmail,
    passwordHash: 'integration-password',
    role: 'provider',
  });
  providerUserId = providerAccount._id;
  const admin = await User.create({
    name: 'Synthetic Admin',
    telephone: '12345678',
    email: adminEmail,
    passwordHash: 'integration-password',
    role: 'admin',
  });
  adminId = admin._id;
  const otherProviderAccount = await User.create({
    name: 'Other Synthetic Provider',
    telephone: '12345678',
    email: otherProviderEmail,
    passwordHash: 'integration-password',
    role: 'provider',
  });
  otherProviderUserId = otherProviderAccount._id;
  providerId = new mongoose.Types.ObjectId();
  providerAccount.providerId = providerId;
  await providerAccount.save();
  const appId = new mongoose.Types.ObjectId();
  const provider = await Provider.create({
    _id: providerId,
    representativeId: providerUserId,
    businessRegistrationNumber: `REG-${suffix}`,
    status: 'pending',
    latestApplicationId: appId,
    applicationSequence: 1,
  });
  await ProviderApplication.create({
    _id: appId,
    providerId,
    version: 1,
    businessRegistrationNumber: provider.businessRegistrationNumber,
    profile: makeProfile(suffix, 'v1'),
    status: 'pending',
  });
  otherProviderId = new mongoose.Types.ObjectId();
  otherApplicationId = new mongoose.Types.ObjectId();
  otherProviderAccount.providerId = otherProviderId;
  await otherProviderAccount.save();
  const otherProvider = await Provider.create({
    _id: otherProviderId,
    representativeId: otherProviderUserId,
    businessRegistrationNumber: `OTHER-${suffix}`,
    status: 'pending',
    latestApplicationId: otherApplicationId,
    applicationSequence: 1,
  });
  await ProviderApplication.create({
    _id: otherApplicationId,
    providerId: otherProviderId,
    version: 1,
    businessRegistrationNumber: otherProvider.businessRegistrationNumber,
    profile: makeProfile(suffix, 'other'),
    status: 'pending',
  });
  providerSid = randomUUID();
  adminSid = randomUUID();
  await AuthSession.create([
    { sid: providerSid, userId: providerUserId, expiresAt: new Date(Date.now() + 60_000) },
    { sid: adminSid, userId: adminId, expiresAt: new Date(Date.now() + 60_000) },
  ]);
  const app = express();
  app.use(express.json());
  app.use('/api/v1', providerRoutes);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const token = (userId, sid) =>
    jwt.sign({ sid }, secret, { algorithm: 'HS256', subject: String(userId), expiresIn: '1m' });
  const providerHeaders = {
    authorization: `Bearer ${token(providerUserId, providerSid)}`,
    'content-type': 'application/json',
  };
  const adminHeaders = {
    authorization: `Bearer ${token(adminId, adminSid)}`,
    'content-type': 'application/json',
  };

  for (const ending of ['', '/']) {
    const filteredList = await fetch(
      `${base}/admin/applications${ending}?providerId=${providerId}`,
      {
        headers: adminHeaders,
      },
    );
    assert.equal(filteredList.status, 200);
    const filtered = await filteredList.json();
    assert.equal(filtered.pagination.total, 1);
    assert.deepEqual(
      filtered.data.map((application) => application.id),
      [String(appId)],
    );

    const invalidApplicationStatus = await fetch(
      `${base}/admin/applications${ending}?status=suspended`,
      {
        headers: adminHeaders,
      },
    );
    assert.equal(invalidApplicationStatus.status, 400);

    const providerList = await fetch(`${base}/admin/providers${ending}?status=pending`, {
      headers: adminHeaders,
    });
    assert.equal(providerList.status, 200);
    const providers = await providerList.json();
    assert.ok(providers.data.some((provider) => provider.id === String(providerId)));
    assert.ok(providers.data.every((provider) => provider.status === 'pending'));

    const invalidProviderFilter = await fetch(
      `${base}/admin/providers${ending}?providerId=${providerId}`,
      {
        headers: adminHeaders,
      },
    );
    assert.equal(invalidProviderFilter.status, 400);
  }

  const forbidden = await fetch(`${base}/admin/applications/${appId}/review`, {
    method: 'POST',
    headers: providerHeaders,
    body: JSON.stringify({ decision: 'approve' }),
  });
  assert.equal(forbidden.status, 403);
  const unknownProfileQuery = await fetch(`${base}/provider/profile?unexpected=1`, {
    headers: providerHeaders,
  });
  assert.equal(unknownProfileQuery.status, 400);
  const repeatedPageQuery = await fetch(`${base}/provider/applications?page=1&page=2`, {
    headers: providerHeaders,
  });
  assert.equal(repeatedPageQuery.status, 400);
  const unknownSubmitQuery = await fetch(`${base}/provider/applications?unexpected=1`, {
    method: 'POST',
    headers: providerHeaders,
    body: JSON.stringify(makeProfile(suffix, 'query')),
  });
  assert.equal(unknownSubmitQuery.status, 400);
  const history = await fetch(`${base}/provider/applications`, { headers: providerHeaders });
  assert.equal(history.status, 200);
  assert.equal((await history.json()).data[0].version, 1);
  const ownerCrossProviderRead = await fetch(
    `${base}/provider/applications/${otherApplicationId}`,
    {
      headers: providerHeaders,
    },
  );
  assert.equal(ownerCrossProviderRead.status, 404);
  const detailWithQuery = await fetch(`${base}/provider/applications/${appId}?unexpected=1`, {
    headers: providerHeaders,
  });
  assert.equal(detailWithQuery.status, 400);
  const adminProviderWithQuery = await fetch(`${base}/admin/providers/${providerId}?unexpected=1`, {
    headers: adminHeaders,
  });
  assert.equal(adminProviderWithQuery.status, 400);
  const adminApplicationWithQuery = await fetch(
    `${base}/admin/applications/${appId}?unexpected=1`,
    { headers: adminHeaders },
  );
  assert.equal(adminApplicationWithQuery.status, 400);
  const reviewWithQuery = await fetch(`${base}/admin/applications/${appId}/review?unexpected=1`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ decision: 'approve' }),
  });
  assert.equal(reviewWithQuery.status, 400);

  const rejected = await fetch(`${base}/admin/applications/${appId}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ decision: 'reject', reason: 'Update document' }),
  });
  assert.equal(rejected.status, 200);
  const revisionBody = JSON.stringify(makeProfile(suffix, 'v2'));
  const submissions = await Promise.all(
    [0, 1].map(() =>
      fetch(`${base}/provider/applications`, {
        method: 'POST',
        headers: providerHeaders,
        body: revisionBody,
      }),
    ),
  );
  assert.deepEqual(submissions.map((response) => response.status).sort(), [201, 409]);
  const successful = await submissions.find((response) => response.status === 201).json();
  const secondId = successful.data.id;
  assert.equal(successful.data.version, 2);
  const approved = await fetch(`${base}/admin/applications/${secondId}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ decision: 'approve' }),
  });
  assert.equal(approved.status, 200);
  let persisted = await Provider.findById(providerId);
  assert.equal(String(persisted.approvedApplicationId), secondId);
  assert.equal(persisted.status, 'approved');
  const providerProfileResponse = await fetch(`${base}/provider/profile`, {
    headers: providerHeaders,
  });
  assert.equal(providerProfileResponse.status, 200);
  const providerProfile = (await providerProfileResponse.json()).data;
  assert.equal(providerProfile.approvedProfile.documentUrl, makeProfile(suffix, 'v2').documentUrl);
  assert.equal(Object.hasOwn(providerProfile, 'revision'), false);
  const providerApplicationResponse = await fetch(`${base}/provider/applications/${secondId}`, {
    headers: providerHeaders,
  });
  assert.equal(providerApplicationResponse.status, 200);
  const providerApplication = (await providerApplicationResponse.json()).data;
  assert.equal(providerApplication.profile.documentUrl, makeProfile(suffix, 'v2').documentUrl);
  assert.equal(Object.hasOwn(providerApplication, 'internal'), false);
  const adminProviderResponse = await fetch(`${base}/admin/providers/${providerId}`, {
    headers: adminHeaders,
  });
  assert.equal(adminProviderResponse.status, 200);
  const adminProvider = (await adminProviderResponse.json()).data;
  assert.equal(adminProvider.approvedProfile.documentUrl, makeProfile(suffix, 'v2').documentUrl);
  assert.equal(Object.hasOwn(adminProvider, 'revision'), false);
  const adminApplicationResponse = await fetch(`${base}/admin/applications/${secondId}`, {
    headers: adminHeaders,
  });
  assert.equal(adminApplicationResponse.status, 200);
  const adminApplication = (await adminApplicationResponse.json()).data;
  assert.equal(adminApplication.profile.documentUrl, makeProfile(suffix, 'v2').documentUrl);
  assert.equal(Object.hasOwn(adminApplication, 'internal'), false);

  const thirdSubmit = await fetch(`${base}/provider/applications`, {
    method: 'POST',
    headers: providerHeaders,
    body: JSON.stringify(makeProfile(suffix, 'v3')),
  });
  assert.equal(thirdSubmit.status, 201);
  const third = await thirdSubmit.json();
  await Provider.updateOne({ _id: providerId }, { $set: { status: 'suspended' } });
  const approvedWhileSuspended = await fetch(`${base}/admin/applications/${third.data.id}/review`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ decision: 'approve' }),
  });
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
