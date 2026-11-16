const assert = require('node:assert/strict');
const test = require('node:test');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const { apiFixture, addDays } = require('./fixtures/api');
const { bookingInput } = require('./fixtures/rentals');

// T12–T18/T39: responses and persisted effects use real routes and MongoDB.
test(
  'vehicle API scopes owners, filters discovery and preserves booked details',
  { timeout: 30000 },
  async (t) => {
    const f = await apiFixture(t);
    const first = await f.createVehicle();
    const second = await f.createVehicle(f.company, {
      model: 'Road .* Literal',
      ratePerDaySatang: 150_000,
    });
    const other = await f.createVehicle(f.otherCompany);
    assert.equal(
      (await f.request(`/company/vehicles/${first.id}`, { actor: f.otherCompany })).status,
      404,
    );
    assert.equal(
      (
        await f.request(`/company/vehicles/${first.id}`, {
          method: 'PATCH',
          actor: f.otherCompany,
          body: { ratePerDaySatang: 1 },
        })
      ).status,
      404,
    );
    assert.equal((await f.request('/company/vehicles', { actor: f.pending })).status, 403);
    assert.equal((await f.request('/company/vehicles', { actor: f.customer })).status, 403);
    assert.equal(
      (await f.request('/company/vehicles/not-an-id', { actor: f.pending })).status,
      403,
    );
    const duplicate = { ...first };
    for (const key of ['id', 'providerId', 'createdAt', 'updatedAt', 'isActive']) {
      delete duplicate[key];
    }
    duplicate.vin = duplicate.vin.toLowerCase();
    assert.equal(
      (
        await f.request('/company/vehicles', {
          method: 'POST',
          actor: f.otherCompany,
          body: duplicate,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.request(`/company/vehicles/${first.id}`, {
          method: 'PATCH',
          actor: f.company,
          body: { vin: 'CHANGED' },
        })
      ).status,
      400,
    );
    const search = await f.request(`/vehicles?providerId=${f.company.providerId}&limit=1`);
    assert.equal(search.status, 200);
    assert.equal(search.body.pagination.total, 2);
    assert.equal(search.body.count, 1);
    const later = await f.request(`/vehicles?providerId=${f.company.providerId}&page=20`);
    assert.equal(later.body.count, 0);
    assert.equal(later.body.pagination.total, 2);
    const literal = await f.request(
      `/vehicles?providerId=${f.company.providerId}&model=${encodeURIComponent('.*')}`,
    );
    assert.deepEqual(
      literal.body.data.map((vehicle) => vehicle.id),
      [second.id],
    );
    assert.equal((await f.request('/vehicles?minSeats[$gt]=1')).status, 400);
    assert.equal((await f.request('/vehicles?startDate=2030-01-01')).status, 400);
    assert.equal(
      (await f.request('/vehicles?minRatePerDaySatang=200&maxRatePerDaySatang=100')).status,
      400,
    );

    const booking = bookingInput({
      userId: f.customer.user._id,
      providerId: f.company.providerId,
      vehicleId: first.id,
      startDate: addDays(f.today, 2),
      dueDate: addDays(f.today, 4),
    });
    booking.vehicleSnapshot.vin = first.vin;
    await Booking.create(booking);
    const occupied = await f.request(
      `/vehicles?providerId=${f.company.providerId}&startDate=${addDays(f.today, 4)}&dueDate=${addDays(f.today, 5)}`,
    );
    assert.deepEqual(
      occupied.body.data.map((vehicle) => vehicle.id),
      [second.id],
    );
    assert.equal(occupied.body.pagination.total, 1);
    const window = await f.request(`/company/vehicles/${first.id}/availability`, {
      method: 'PATCH',
      actor: f.company,
      body: { availableFrom: f.today, availableUntil: addDays(f.today, 3) },
    });
    assert.equal(window.status, 409);
    assert.equal((await Vehicle.findById(first.id)).availableUntil, null);
    const changed = await f.request(`/company/vehicles/${first.id}`, {
      method: 'PATCH',
      actor: f.company,
      body: {
        ratePerDaySatang: 120_000,
        pickupBranch: { name: 'Branch B', address: 'Another Road' },
      },
    });
    assert.equal(changed.status, 200);
    const saved = await Booking.findOne({ vehicleId: first.id });
    assert.equal(saved.vehicleSnapshot.pickupBranch.name, 'Branch A');
    assert.equal(saved.ratePerDaySatang, 100_000);
    assert.equal(
      (
        await f.request(`/company/vehicles/${first.id}/activation`, {
          method: 'PATCH',
          actor: f.company,
          body: { isActive: false },
        })
      ).status,
      200,
    );
    assert.equal((await f.request(`/vehicles/${first.id}`)).status, 404);
    assert.equal((await Booking.findById(saved._id)).state, 'confirmed');
    assert.equal(
      (
        await f.request(`/company/vehicles/${first.id}/activation`, {
          method: 'PATCH',
          actor: f.company,
          body: { isActive: true },
        })
      ).status,
      200,
    );
    const provider = await f.request(`/providers/${f.company.providerId}`);
    assert.deepEqual(Object.keys(provider.body.data).sort(), [
      'address',
      'id',
      'name',
      'telephone',
    ]);
    await Provider.updateOne({ _id: f.otherCompany.providerId }, { $set: { status: 'suspended' } });
    assert.equal((await f.request(`/vehicles/${other.id}`)).status, 404);
    assert.equal((await f.request(`/providers/${f.otherCompany.providerId}`)).status, 404);
  },
);
