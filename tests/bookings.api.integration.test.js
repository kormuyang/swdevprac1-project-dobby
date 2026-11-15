const assert = require('node:assert/strict');
const test = require('node:test');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const { apiFixture, addDays } = require('./fixtures/api');
const { bookingInput } = require('./fixtures/rentals');

// T19–T30: cap and overlap are tested with simultaneous HTTP requests and persisted counts.
test('booking API enforces ownership, snapshots, cutoffs and real concurrent limits', { timeout: 30000 }, async (t) => {
  const f = await apiFixture(t, [['/api/v1/bookings', require('../routes/bookings')]]);
  const car = await f.createVehicle();
  const future = { vehicleId: car.id, startDate: addDays(f.today, 2), dueDate: addDays(f.today, 4) };
  const book = (body, actor = f.customer) => f.request('/bookings', { method: 'POST', actor, body });
  const first = await book(future);
  assert.equal(first.status, 201);
  const id = first.body.data.id;
  assert.equal(first.body.data.rentalDays, 3);
  assert.equal(first.body.data.totalPriceSatang, 300_000);
  assert.equal(first.body.data.status, 'upcoming');
  assert.equal((await book(future, f.company)).status, 403);
  assert.equal((await book(future, f.admin)).status, 403);
  assert.equal((await book({ ...future, ratePerDaySatang: 1 })).status, 400);
  assert.equal((await f.request(`/bookings/${id}`, { actor: f.otherCustomer })).status, 404);
  assert.equal((await f.request(`/bookings/${id}`, { method: 'PATCH', actor: f.otherCustomer,
    body: { startDate: future.startDate, dueDate: future.dueDate } })).status, 404);
  assert.equal((await f.request(`/bookings/${id}`, { method: 'DELETE', actor: f.otherCustomer })).status, 404);
  assert.equal((await f.request(`/bookings/${id}`, { actor: f.admin })).status, 200);
  assert.equal((await f.request('/bookings?userId=507f1f77bcf86cd799439011', { actor: f.customer })).status, 400);
  assert.equal((await book(future, f.otherCustomer)).status, 409);

  await f.request(`/company/vehicles/${car.id}`, { method: 'PATCH', actor: f.company,
    body: { pickupBranch: { name: 'New Branch', address: 'New Road' }, ratePerDaySatang: 120_000 } });
  const edited = await f.request(`/bookings/${id}`, { method: 'PATCH', actor: f.customer,
    body: { startDate: addDays(f.today, 6), dueDate: addDays(f.today, 7) } });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.data.ratePerDaySatang, 100_000);
  assert.equal(edited.body.data.totalPriceSatang, 200_000);
  assert.equal(edited.body.data.vehicleSnapshot.pickupBranch.name, 'Branch A');
  const adminEdit = await f.request(`/bookings/${id}`, { method: 'PATCH', actor: f.admin,
    body: { startDate: addDays(f.today, 8), dueDate: addDays(f.today, 9) } });
  assert.equal(adminEdit.status, 200);
  assert.equal(adminEdit.body.data.userId, f.customer.user.id);
  assert.equal(adminEdit.body.data.ratePerDaySatang, 100_000);
  const cancelled = await f.request(`/bookings/${id}`, { method: 'DELETE', actor: f.customer });
  assert.equal(cancelled.status, 200);
  const again = await f.request(`/bookings/${id}`, { method: 'DELETE', actor: f.customer });
  assert.equal(again.status, 200);
  assert.equal(again.body.data.cancelledAt, cancelled.body.data.cancelledAt);
  assert.equal((await Booking.findById(id)).state, 'cancelled');

  const cars = [];
  for (let index = 0; index < 4; index++) {
    cars.push(await f.createVehicle(index === 3 ? f.otherCompany : f.company));
  }
  const dates = { startDate: addDays(f.today, 10), dueDate: addDays(f.today, 10) };
  const capIds = [];
  for (const vehicle of cars.slice(0, 2)) {
    const response = await book({ vehicleId: vehicle.id, ...dates });
    assert.equal(response.status, 201);
    capIds.push(response.body.data.id);
  }
  const capRace = await Promise.all(cars.slice(2).map((vehicle) => book({ vehicleId: vehicle.id, ...dates })));
  assert.deepEqual(capRace.map((response) => response.status).sort(), [201, 409]);
  capIds.push(capRace.find((response) => response.status === 201).body.data.id);
  assert.equal(await Booking.countDocuments({ userId: f.customer.user._id, state: 'confirmed', dueDate: { $gte: f.today } }), 3);
  for (const bookingId of capIds) {
    assert.equal((await f.request(`/bookings/${bookingId}`, { method: 'DELETE', actor: f.customer })).status, 200);
  }

  const contested = await f.createVehicle();
  const overlapRace = await Promise.all([f.customer, f.otherCustomer].map((actor) => book({ vehicleId: contested.id, ...dates }, actor)));
  assert.deepEqual(overlapRace.map((response) => response.status).sort(), [201, 409]);
  assert.equal(await Booking.countDocuments({ vehicleId: contested.id, state: 'confirmed' }), 1);
  const nextDay = await book({ vehicleId: contested.id, startDate: addDays(f.today, 11), dueDate: addDays(f.today, 11) });
  assert.equal(nextDay.status, 201);

  const sameDayCar = await f.createVehicle();
  const sameDay = await book({ vehicleId: sameDayCar.id, startDate: f.today, dueDate: f.today });
  assert.equal(sameDay.status, 201);
  const sameDayId = sameDay.body.data.id;
  assert.equal(sameDay.body.data.status, 'ongoing');
  assert.equal((await f.request(`/bookings/${sameDayId}`, { method: 'DELETE', actor: f.customer })).status, 409);
  assert.equal((await f.request(`/bookings/${sameDayId}`, { method: 'PATCH', actor: f.admin,
    body: { startDate: addDays(f.today, 20), dueDate: addDays(f.today, 50) } })).status, 409);
  assert.equal((await f.request(`/bookings/${sameDayId}`, { method: 'DELETE', actor: f.admin })).status, 200);
  assert.equal((await Booking.findById(sameDayId)).cancellationReason, 'admin_cancelled');
  assert.equal((await book({ vehicleId: sameDayCar.id, startDate: f.today, dueDate: addDays(f.today, 30) })).status, 400);
  assert.equal((await book({ vehicleId: sameDayCar.id, startDate: addDays(f.today, -1), dueDate: f.today })).status, 400);

  const historical = bookingInput({ userId: f.customer.user._id, providerId: f.company.providerId,
    vehicleId: sameDayCar.id, startDate: addDays(f.today, -1), dueDate: addDays(f.today, -1), rentalDays: 1, totalPriceSatang: 100_000 });
  historical.vehicleSnapshot.vin = sameDayCar.vin;
  const completed = await Booking.create(historical);
  assert.equal((await f.request(`/bookings/${completed.id}`, { method: 'DELETE', actor: f.admin })).status, 409);
  const history = await f.request('/bookings?status=completed', { actor: f.customer });
  assert.equal(history.status, 200);
  assert.ok(history.body.data.some((booking) => booking.id === completed.id));
  assert.ok(history.body.data.every((booking) => booking.userId === f.customer.user.id));
  await Vehicle.updateOne({ _id: sameDayCar.id }, { $set: { isActive: false } });
  assert.equal((await book({ vehicleId: sameDayCar.id, startDate: addDays(f.today, 25), dueDate: addDays(f.today, 25) })).status, 409);
});
