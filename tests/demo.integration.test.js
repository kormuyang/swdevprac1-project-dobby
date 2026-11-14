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
  const f = await apiFixture(t, [
    ['/api/v1/bookings', require('../routes/bookings')],
    ['/api/v1/company/bookings', require('../routes/companyBookings')],
    ['/api/v1/admin', require('../routes/adminProviders')],
  ]);
  const previous = { DEMO_BASE_URL: process.env.DEMO_BASE_URL,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD };
  process.env.DEMO_BASE_URL = f.base;
  process.env.SEED_ADMIN_EMAIL = f.admin.user.email;
  process.env.SEED_ADMIN_PASSWORD = 'synthetic-password';
  const runId = randomUUID();
  const emails = [`demo-customer-${runId}@example.test`, `demo-${runId}@example.test`];
  try {
    const summary = await runDemo({ runId });
    assert.ok(summary.count >= 30);
    const company = await User.findOne({ email: emails[1] });
    const provider = await Provider.findById(company.providerId);
    assert.equal(provider.status, 'approved');
    assert.equal(await ProviderApplication.countDocuments({ providerId: provider._id }), 3);
    const vehicles = await Vehicle.find({ providerId: provider._id });
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].ratePerDaySatang, 120_000);
    const bookings = await Booking.find({ providerId: provider._id });
    assert.equal(bookings.length, 3);
    assert.ok(bookings.every((booking) => booking.state === 'cancelled'));
    assert.deepEqual(bookings.map((booking) => booking.cancellationReason).sort(),
      ['admin_cancelled', 'customer_cancelled', 'provider_suspended']);
    const original = bookings.find((booking) => booking.cancellationReason === 'customer_cancelled');
    assert.equal(original.ratePerDaySatang, 100_000);
    assert.equal(original.totalPriceSatang, 200_000);
    assert.equal(original.vehicleSnapshot.pickupBranch.name, 'Branch A');
  } finally {
    const accounts = await User.find({ email: { $in: emails } }).select('_id providerId');
    const providerIds = accounts.map((user) => user.providerId).filter(Boolean);
    const ids = accounts.map((user) => user._id);
    await Booking.deleteMany({ providerId: { $in: providerIds } });
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
