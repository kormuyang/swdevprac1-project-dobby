const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const test = require('node:test');
const User = require('../models/User');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const AuthSession = require('../models/AuthSession');
const bookingCancellation = require('../services/bookingCancellation');

// These native fixtures exercise the agreed B collection/guard contract, not B's unimplemented HTTP APIs.
test('suspension cancels atomically, blocks old sessions, and reactivation restores no bookings', { timeout: 30000 }, async (t) => {
  const uri = process.env.TEST_MONGO_URI;
  assert.ok(uri, 'TEST_MONGO_URI must name dedicated dobby_test_a.');
  assert.equal(new URL(uri).pathname, '/dobby_test_a');
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomUUID();
  const userIds = [];
  const providerId = new mongoose.Types.ObjectId();
  const applicationId = new mongoose.Types.ObjectId();
  const vehicleId = new mongoose.Types.ObjectId();
  const otherProviderId = new mongoose.Types.ObjectId();
  const bookingIds = [];
  let server;
  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.collection('bookings').deleteMany({ _id: { $in: bookingIds } });
        await mongoose.connection.collection('vehicles').deleteOne({ _id: vehicleId });
        await AuthSession.deleteMany({ userId: { $in: userIds } });
        await ProviderApplication.deleteOne({ _id: applicationId });
        await Provider.deleteOne({ _id: providerId });
        await User.deleteMany({ _id: { $in: userIds } });
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
  await mongoose.connect(uri);
  for (const Model of [User, Provider, ProviderApplication, AuthSession]) {
    await Model.init();
  }
  async function account(role, linkedProviderId = null) {
    const id = new mongoose.Types.ObjectId();
    userIds.push(id);
    const user = await User.create({ _id: id, name: 'Lifecycle Synthetic', telephone: '123456789',
      email: `${randomUUID()}@example.test`, passwordHash: 'test-lifecycle-pass', role, providerId: linkedProviderId });
    const sid = randomUUID();
    await AuthSession.create({ sid, userId: id, expiresAt: new Date(Date.now() + 3600000) });
    return { user, token: jwt.sign({ sid }, process.env.JWT_SECRET, { subject: String(id), algorithm: 'HS256', expiresIn: '1h' }) };
  }
  const admin = await account('admin');
  const company = await account('company', providerId);
  const customer = await account('user');
  const registrationNumber = randomUUID();
  await Provider.create({ _id: providerId, representativeId: company.user._id,
    businessRegistrationNumber: registrationNumber, status: 'approved', approvedApplicationId: applicationId,
    latestApplicationId: applicationId, applicationSequence: 1 });
  await ProviderApplication.create({ _id: applicationId, providerId, version: 1, businessRegistrationNumber: registrationNumber,
    status: 'approved', profile: { legalName: 'Lifecycle Synthetic', registeredAddress: 'Test address',
      telephone: '123456789', contactEmail: 'contact@example.test', documentUrl: 'https://example.test/document' } });
  const vehicles = mongoose.connection.collection('vehicles');
  const bookings = mongoose.connection.collection('bookings');
  await vehicles.insertOne({ _id: vehicleId, providerId, revision: 0 });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  async function booking(state, dueDate, ownerProvider = providerId) {
    const _id = new mongoose.Types.ObjectId();
    bookingIds.push(_id);
    await bookings.insertOne({ _id, userId: customer.user._id, providerId: ownerProvider,
      vehicleId, state, startDate: today, dueDate });
    return _id;
  }
  const activeId = await booking('confirmed', today);
  const futureId = await booking('confirmed', '2099-12-31');
  const completedId = await booking('confirmed', '2000-01-01');
  const cancelledId = await booking('cancelled', '2099-12-31');
  const otherId = await booking('confirmed', '2099-12-31', otherProviderId);
  const app = express();
  app.use('/api/v1/auth', require('../routes/auth'));
  app.use('/api/v1/admin/providers', require('../routes/providerLifecycle'));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function action(name, body, token = admin.token) {
    return fetch(`${base}/api/v1/admin/providers/${providerId}/${name}`, { method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }
  assert.equal((await action('suspend', { reason: 'Test suspension' }, customer.token)).status, 403);
  assert.equal((await action('suspend', { reason: '' })).status, 400);
  const response = await action('suspend', { reason: 'Test suspension' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.cancelledBookingCount, 2);
  for (const id of [activeId, futureId]) {
    const saved = await bookings.findOne({ _id: id });
    assert.equal(saved.state, 'cancelled');
    assert.equal(saved.cancellationReason, 'provider_suspended');
    assert.equal(String(saved.cancelledBy), admin.user.id);
  }
  assert.equal((await bookings.findOne({ _id: completedId })).state, 'confirmed');
  assert.equal((await bookings.findOne({ _id: cancelledId })).cancelledAt, undefined);
  assert.equal((await bookings.findOne({ _id: otherId })).state, 'confirmed');
  assert.equal((await action('suspend', { reason: 'Again' })).status, 409);
  assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: { authorization: `Bearer ${company.token}` } })).status, 403);
  assert.equal((await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: company.user.email, password: 'test-lifecycle-pass' }) })).status, 403);
  assert.equal((await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${company.token}` } })).status, 200);
  assert.equal((await action('reactivate', { resolutionNote: 'Resolved' })).status, 200);
  assert.equal((await action('reactivate', { resolutionNote: 'Again' })).status, 409);
  assert.equal((await bookings.findOne({ _id: activeId })).state, 'cancelled');
  assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: { authorization: `Bearer ${company.token}` } })).status, 401);

  const rollbackId = await booking('confirmed', '2099-12-31');
  const revisionBefore = (await Provider.findById(providerId)).revision;
  const original = bookingCancellation.cancelNonCompletedForProvider;
  const failure = t.mock.method(bookingCancellation, 'cancelNonCompletedForProvider', async (input) => {
    await original(input);
    throw new Error('synthetic cancellation failure');
  });
  const failed = await action('suspend', { reason: 'Must roll back' });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { success: false, message: 'The request could not be completed.' });
  assert.equal((await Provider.findById(providerId)).status, 'approved');
  assert.equal((await Provider.findById(providerId)).revision, revisionBefore);
  assert.equal((await bookings.findOne({ _id: rollbackId })).state, 'confirmed');
  failure.mock.restore();

  // A concurrent B-style creation takes the same provider -> user -> vehicle guards.
  const session = await mongoose.startSession();
  let release;
  let acquired;
  const locked = new Promise((resolve) => { acquired = resolve; });
  const barrier = new Promise((resolve) => { release = resolve; });
  const raceId = new mongoose.Types.ObjectId();
  bookingIds.push(raceId);
  const creation = session.withTransaction(async () => {
    const provider = await Provider.findByIdAndUpdate(providerId, { $inc: { revision: 1 } }, { session, returnDocument: 'after' });
    assert.equal(provider.status, 'approved');
    await User.updateOne({ _id: customer.user._id }, { $inc: { bookingRevision: 1 } }, { session });
    await vehicles.updateOne({ _id: vehicleId, providerId }, { $inc: { revision: 1 } }, { session });
    acquired();
    await barrier;
    await bookings.insertOne({ _id: raceId, userId: customer.user._id, vehicleId, providerId,
      state: 'confirmed', startDate: today, dueDate: '2099-12-31' }, { session });
  });
  let contentionObserved;
  const contention = new Promise((resolve) => { contentionObserved = resolve; });
  const originalGuard = Provider.findByIdAndUpdate;
  const guardObserver = t.mock.method(Provider, 'findByIdAndUpdate', function (...args) {
    const query = originalGuard.apply(this, args);
    if (args[2].session === session) {
      return query;
    }
    return query.exec().catch((error) => {
      if (error.hasErrorLabel?.('TransientTransactionError')) {
        contentionObserved();
      }
      throw error;
    });
  });
  let suspension;
  let timeout;
  try {
    await locked;
    suspension = action('suspend', { reason: 'Race test' });
    // Hold the competing transaction until MongoDB reports an actual guard conflict.
    await Promise.race([
      contention,
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('No provider guard contention was observed.')), 5000);
      }),
    ]);
    release();
    await creation;
    assert.equal((await suspension).status, 200);
    assert.equal(await bookings.countDocuments({ providerId, state: 'confirmed', dueDate: { $gte: today } }), 0);
  } finally {
    clearTimeout(timeout);
    release();
    await creation;
    if (suspension) {
      await suspension;
    }
    guardObserver.mock.restore();
    await session.endSession();
  }
});
