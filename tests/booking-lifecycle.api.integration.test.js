const assert = require('node:assert/strict');
const test = require('node:test');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const cancellation = require('../services/bookingCancellation');
const { apiFixture, addDays } = require('./fixtures/api');
const { bookingInput } = require('./fixtures/rentals');

function barrier() {
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  return { ready, release };
}

async function until(promise, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), 4000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

test(
  'company views and real booking/suspension races preserve privacy and atomicity',
  { timeout: 30000 },
  async (t) => {
    const f = await apiFixture(t, [
      ['/api/v1/bookings', require('../routes/bookings')],
      ['/api/v1/company/bookings', require('../routes/companyBookings')],
      ['/api/v1/admin', require('../routes/adminProviders')],
    ]);
    const car = await f.createVehicle();
    const otherCar = await f.createVehicle(f.otherCompany);
    async function book(vehicle, days = 5, actor = f.customer) {
      const result = await f.request('/bookings', {
        method: 'POST',
        actor,
        body: {
          vehicleId: vehicle.id,
          startDate: addDays(f.today, days),
          dueDate: addDays(f.today, days),
        },
      });
      assert.equal(result.status, 201);
      return result.body.data;
    }
    function lifecycle(action, body) {
      return f.request(`/admin/providers/${f.company.providerId}/${action}`, {
        method: 'POST',
        actor: f.admin,
        body,
      });
    }
    const ownBooking = await book(car);
    const otherBooking = await book(otherCar, 5, f.otherCustomer);
    await User.updateOne({ _id: f.customer.user._id }, { $set: { name: 'Current Customer Name' } });
    const list = await f.request('/company/bookings', { actor: f.company });
    assert.equal(list.status, 200);
    assert.deepEqual(
      list.body.data.map((entry) => entry.id),
      [ownBooking.id],
    );
    assert.equal(list.body.data[0].customer.name, 'Current Customer Name');
    assert.equal(list.body.data[0].customer.passwordHash, undefined);
    assert.equal(
      (await f.request(`/company/bookings/${ownBooking.id}`, { actor: f.otherCompany })).status,
      404,
    );
    assert.equal(
      (await f.request(`/company/bookings?vehicleId=${otherCar.id}`, { actor: f.company })).status,
      404,
    );
    assert.equal(
      (await f.request(`/bookings/${ownBooking.id}`, { method: 'DELETE', actor: f.company }))
        .status,
      403,
    );
    const adminList = await f.request(
      `/bookings?providerId=${f.company.providerId}&userId=${f.customer.user.id}`,
      { actor: f.admin },
    );
    assert.deepEqual(
      adminList.body.data.map((entry) => entry.id),
      [ownBooking.id],
    );

    // A pending/rejected revision must not replace the approved public profile.
    const publicBefore = (await f.request(`/providers/${f.company.providerId}`)).body.data;
    const revision = await f.request('/company/applications', {
      method: 'POST',
      actor: f.company,
      body: {
        legalName: 'Proposed Name',
        registeredAddress: 'Proposed Road',
        telephone: '123456789',
        contactEmail: 'revision@example.test',
        documentUrl: 'https://example.test/private-revision',
      },
    });
    assert.equal(revision.status, 201);
    assert.deepEqual(
      (await f.request(`/providers/${f.company.providerId}`)).body.data,
      publicBefore,
    );
    const reject = await f.request(`/admin/applications/${revision.body.data.id}/review`, {
      method: 'POST',
      actor: f.admin,
      body: { decision: 'reject', reason: 'Synthetic review' },
    });
    assert.equal(reject.status, 200);
    assert.deepEqual(
      (await f.request(`/providers/${f.company.providerId}`)).body.data,
      publicBefore,
    );

    async function raceSuspension(startRequest, matches) {
      const held = barrier();
      const release = barrier();
      const contended = barrier();
      let heldSession;
      const originalSave = Booking.prototype.save;
      const hold = t.mock.method(Booking.prototype, 'save', async function (...args) {
        if (!heldSession && matches(this)) {
          heldSession = args[0].session;
          held.release();
          await release.ready;
        }
        return originalSave.apply(this, args);
      });
      const originalGuard = Provider.findByIdAndUpdate;
      const observer = t.mock.method(Provider, 'findByIdAndUpdate', function (...args) {
        const query = originalGuard.apply(this, args);
        if (args[2].session === heldSession || !heldSession) {
          return query;
        }
        return query.exec().catch((error) => {
          if (error.hasErrorLabel?.('TransientTransactionError')) {
            contended.release();
          }
          throw error;
        });
      });
      let writing;
      let suspension;
      try {
        writing = startRequest();
        await until(held.ready, 'The booking write did not acquire its real guards.');
        suspension = lifecycle('suspend', { reason: 'Synthetic concurrent suspension' });
        await until(contended.ready, 'MongoDB did not report provider guard contention.');
        release.release();
        const written = await writing;
        assert.ok([200, 201].includes(written.status));
        assert.equal((await suspension).status, 200);
        assert.equal(
          await Booking.countDocuments({
            providerId: f.company.providerId,
            state: 'confirmed',
            dueDate: { $gte: f.today },
          }),
          0,
        );
      } finally {
        release.release();
        if (writing) {
          await writing;
        }
        if (suspension) {
          await suspension;
        }
        hold.mock.restore();
        observer.mock.restore();
      }
    }

    const racingCar = await f.createVehicle();
    await raceSuspension(
      () =>
        f.request('/bookings', {
          method: 'POST',
          actor: f.customer,
          body: {
            vehicleId: racingCar.id,
            startDate: addDays(f.today, 10),
            dueDate: addDays(f.today, 10),
          },
        }),
      (booking) => booking.isNew && String(booking.vehicleId) === racingCar.id,
    );
    assert.equal((await Booking.findById(ownBooking.id)).state, 'cancelled');
    assert.equal((await Booking.findById(otherBooking.id)).state, 'confirmed');
    assert.equal((await f.request('/company/bookings', { actor: f.company })).status, 403);
    assert.equal((await f.request('/company/vehicles', { actor: f.company })).status, 403);
    assert.equal((await f.request(`/vehicles/${car.id}`)).status, 404);
    const deniedBooking = await f.request('/bookings', {
      method: 'POST',
      actor: f.customer,
      body: {
        vehicleId: car.id,
        startDate: addDays(f.today, 12),
        dueDate: addDays(f.today, 12),
      },
    });
    assert.equal(deniedBooking.status, 409);
    assert.equal(
      (
        await f.request(`/bookings/${ownBooking.id}`, {
          method: 'PATCH',
          actor: f.admin,
          body: { startDate: addDays(f.today, 12), dueDate: addDays(f.today, 12) },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.request(`/company/vehicles/${car.id}/activation`, {
          method: 'PATCH',
          actor: f.company,
          body: { isActive: false },
        })
      ).status,
      403,
    );
    assert.equal(
      (await lifecycle('reactivate', { resolutionNote: 'Synthetic resolution' })).status,
      200,
    );
    assert.equal((await Booking.findById(ownBooking.id)).state, 'cancelled');

    const editTarget = await book(car, 15);
    await raceSuspension(
      () =>
        f.request(`/bookings/${editTarget.id}`, {
          method: 'PATCH',
          actor: f.customer,
          body: { startDate: addDays(f.today, 16), dueDate: addDays(f.today, 16) },
        }),
      (booking) => String(booking._id) === editTarget.id,
    );
    assert.equal((await Booking.findById(editTarget.id)).state, 'cancelled');
    assert.equal(
      (await lifecycle('reactivate', { resolutionNote: 'Synthetic resolution' })).status,
      200,
    );

    const rollbackBooking = await book(car, 20);
    const before = await Provider.findById(f.company.providerId);
    const userRevisionBefore = (await User.findById(f.customer.user._id)).bookingRevision;
    const vehicleRevisionBefore = (await Vehicle.findById(car.id)).revision;
    const originalCancel = cancellation.cancelNonCompletedForProvider;
    const failure = t.mock.method(cancellation, 'cancelNonCompletedForProvider', async (input) => {
      await originalCancel(input);
      throw new Error('Synthetic failure after real cancellation writes');
    });
    try {
      const failed = await lifecycle('suspend', { reason: 'Synthetic rollback test' });
      assert.equal(failed.status, 500);
      assert.deepEqual(failed.body, {
        success: false,
        message: 'The request could not be completed.',
      });
      assert.equal((await Provider.findById(f.company.providerId)).status, 'approved');
      assert.equal((await Provider.findById(f.company.providerId)).revision, before.revision);
      assert.equal((await Booking.findById(rollbackBooking.id)).state, 'confirmed');
      assert.equal((await User.findById(f.customer.user._id)).bookingRevision, userRevisionBefore);
      assert.equal((await Vehicle.findById(car.id)).revision, vehicleRevisionBefore);
    } finally {
      failure.mock.restore();
    }
    const completedInput = bookingInput({
      userId: f.customer.user._id,
      providerId: f.company.providerId,
      vehicleId: car.id,
      startDate: addDays(f.today, -1),
      dueDate: addDays(f.today, -1),
      rentalDays: 1,
      totalPriceSatang: 100_000,
    });
    completedInput.vehicleSnapshot.vin = car.vin;
    const completed = await Booking.create(completedInput);
    assert.equal(
      (await lifecycle('suspend', { reason: 'Synthetic final suspension' })).status,
      200,
    );
    assert.equal((await Booking.findById(completed._id)).state, 'confirmed');
    assert.equal(
      (await Booking.findById(rollbackBooking.id)).cancellationReason,
      'provider_suspended',
    );
    assert.equal(
      (await f.request('/auth/logout', { method: 'POST', actor: f.company })).status,
      200,
    );
    assert.equal(
      (await lifecycle('reactivate', { resolutionNote: 'Synthetic resolution' })).status,
      200,
    );
    assert.equal((await f.request('/company/bookings', { actor: f.company })).status, 401);
    assert.equal((await Booking.findById(rollbackBooking.id)).state, 'cancelled');
    assert.equal((await Vehicle.findById(car.id)).isActive, true);
    const login = await f.request('/auth/login', {
      method: 'POST',
      body: {
        email: f.company.user.email,
        password: 'synthetic-password',
      },
    });
    assert.equal(login.status, 200);
    const renewed = { token: login.body.data.token };
    const cancelledHistory = await f.request('/company/bookings?status=cancelled', {
      actor: renewed,
    });
    assert.equal(cancelledHistory.status, 200);
    assert.ok(cancelledHistory.body.data.some((entry) => entry.id === rollbackBooking.id));
    const completedHistory = await f.request('/company/bookings?status=completed', {
      actor: renewed,
    });
    assert.equal(completedHistory.status, 200);
    assert.ok(completedHistory.body.data.some((entry) => entry.id === completed.id));
    assert.equal(
      (await f.request(`/company/bookings/${completed.id}`, { actor: renewed })).status,
      200,
    );
  },
);
