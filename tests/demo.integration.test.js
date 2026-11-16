const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const User = require('../models/User');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const AuthSession = require('../models/AuthSession');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { apiFixture } = require('./fixtures/api');
const { runDemo } = require('../scripts/test-demo');

test('combined Newman demo persists the complete A+B journey', { timeout: 30000 }, async (t) => {
  const f = await apiFixture(t);
  const previous = {
    DEMO_BASE_URL: process.env.DEMO_BASE_URL,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
  };
  process.env.DEMO_BASE_URL = f.base;
  process.env.SEED_ADMIN_EMAIL = f.admin.user.email;
  process.env.SEED_ADMIN_PASSWORD = 'synthetic-password';
  const vehicle = await f.createVehicle();
  const runId = randomUUID();
  const emails = [`demo-customer-${runId}@example.test`, `demo-${runId}@example.test`];
  try {
    const summary = await runDemo({ runId, vehicleId: vehicle.id });
    assert.equal(summary.count, 36);
    const providerAccount = await User.findOne({ email: emails[1] });
    const provider = await Provider.findById(providerAccount.providerId);
    assert.equal(provider.status, 'approved');
    assert.equal(await ProviderApplication.countDocuments({ providerId: provider._id }), 2);
    const vehicles = await Vehicle.find({ providerId: provider._id });
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].ratePerDaySatang, 120_000);
    const bookings = await Booking.find({ providerId: provider._id });
    assert.equal(bookings.length, 1);
    assert.equal(bookings[0].state, 'cancelled');
    assert.equal(bookings[0].cancellationReason, 'provider_suspended');
    assert.equal(bookings[0].ratePerDaySatang, 120_000);
    const customerAccount = await User.findOne({ email: emails[0] });
    const requiredBookings = await Booking.find({
      userId: customerAccount._id,
      vehicleId: vehicle.id,
    });
    assert.equal(requiredBookings.length, 2);
    assert.deepEqual(requiredBookings.map((b) => b.cancellationReason).sort(), [
      'admin_cancelled',
      'customer_cancelled',
    ]);
  } finally {
    const accounts = await User.find({ email: { $in: emails } }).select('_id providerId');
    const providerIds = accounts.map((user) => user.providerId).filter(Boolean);
    const ids = accounts.map((user) => user._id);
    await Booking.deleteMany({
      $or: [{ providerId: { $in: providerIds } }, { userId: { $in: ids } }],
    });
    await Vehicle.deleteMany({ providerId: { $in: providerIds } });
    await ProviderApplication.deleteMany({ providerId: { $in: providerIds } });
    await Provider.deleteMany({ _id: { $in: providerIds } });
    await AuthSession.deleteMany({ userId: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
