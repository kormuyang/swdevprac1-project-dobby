const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const { bookingInput } = require('./fixtures/rentals');
const { validateBookingCreate, validateBookingDatesUpdate } = require('../validators/bookings');
const { serializeBooking } = require('../serializers/bookings');
const { components } = require('../docs/contracts/openapi.json');

test('booking validators accept only vehicle selection and dates', () => {
  const body = {
    vehicleId: 'ABCDEF0123456789ABCDEF01',
    startDate: '2030-01-10',
    dueDate: '2030-01-12',
  };
  assert.deepEqual(validateBookingCreate(body), {
    ...body,
    vehicleId: body.vehicleId.toLowerCase(),
  });
  for (const field of [
    'userId',
    'providerId',
    'state',
    'status',
    'ratePerDaySatang',
    'totalPriceSatang',
    'vehicleSnapshot',
    'rentalDays',
  ]) {
    assert.throws(() => validateBookingCreate({ ...body, [field]: 'forged' }), { status: 400 });
  }
  assert.deepEqual(
    validateBookingDatesUpdate({ startDate: body.startDate, dueDate: body.dueDate }),
    {
      startDate: body.startDate,
      dueDate: body.dueDate,
    },
  );
  assert.throws(() => validateBookingDatesUpdate(body), { status: 400 });
  for (const invalid of [
    {},
    { startDate: '2030-01-10' },
    { startDate: '2030-01-12', dueDate: '2030-01-10' },
    { startDate: '2030-02-30', dueDate: '2030-03-01' },
    { startDate: { $gt: '' }, dueDate: '2030-01-12' },
  ]) {
    assert.throws(() => validateBookingDatesUpdate(invalid), { status: 400 });
  }
});

test('booking model enforces required references, calendar dates, duration and price consistency', async () => {
  const booking = new Booking(bookingInput());
  await booking.validate();
  assert.equal(booking.state, 'confirmed');
  assert.equal(booking.currency, 'THB');
  assert.equal(booking.cancelledAt, null);
  assert.equal(booking.cancelledBy, null);
  assert.equal(booking.cancellationReason, null);
  for (const invalid of [
    { userId: null },
    { providerId: null },
    { vehicleId: null },
    { vehicleSnapshot: null },
    { startDate: '2030-02-30' },
    { dueDate: '2030-01-09' },
    { dueDate: '2030-02-09', rentalDays: 31, totalPriceSatang: 3_100_000 },
    { rentalDays: 2 },
    { totalPriceSatang: 299_999 },
    { ratePerDaySatang: 1.5 },
    { state: 'completed' },
    { currency: 'USD' },
    { cancellationReason: 'other' },
  ]) {
    await assert.rejects(new Booking(bookingInput(invalid)).validate(), {
      name: 'ValidationError',
    });
  }
  // Reading or saving historical records must not apply the new-rental cutoff.
  await new Booking(bookingInput({ startDate: '2000-01-01', dueDate: '2000-01-03' })).validate();
  await new Booking(
    bookingInput({ dueDate: '2030-01-10', rentalDays: 1, totalPriceSatang: 100_000 }),
  ).validate();
});

test('booking output matches OpenAPI, derives status and uses current customer contact', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const booking = new Booking(bookingInput());
  booking.createdAt = now;
  booking.updatedAt = now;
  const customer = {
    _id: booking.userId,
    name: 'Current Name',
    email: 'synthetic@example.test',
    telephone: '123456789',
    passwordHash: 'private',
    bookingRevision: 9,
  };
  const dto = serializeBooking(booking, customer, '2030-01-10');
  assert.deepEqual(
    Object.keys(dto).sort(),
    Object.keys(components.schemas.Booking.properties).sort(),
  );
  assert.deepEqual(dto.customer, {
    id: String(booking.userId),
    name: customer.name,
    email: customer.email,
    telephone: customer.telephone,
  });
  assert.equal(dto.status, 'ongoing');
  assert.equal(dto.state, undefined);
  assert.equal(dto.__v, undefined);
  assert.equal(dto.cancelledAt, null);
  customer.name = 'Updated Name';
  assert.equal(serializeBooking(booking, customer, '2030-01-13').customer.name, 'Updated Name');
  assert.equal(serializeBooking(booking, customer, '2030-01-13').status, 'completed');
  assert.throws(() => serializeBooking(booking, null, '2030-01-10'));
  assert.throws(() => serializeBooking(booking, { _id: booking.userId }, '2030-01-10'));
  assert.throws(() =>
    serializeBooking(booking, { ...customer, _id: new mongoose.Types.ObjectId() }, '2030-01-10'),
  );
  booking.state = 'cancelled';
  booking.cancelledAt = now;
  booking.cancelledBy = customer._id;
  booking.cancellationReason = 'customer_cancelled';
  const cancelled = serializeBooking(booking, customer, '2030-01-09');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelledAt, now.toISOString());
  assert.equal(cancelled.cancelledBy, String(customer._id));
});
