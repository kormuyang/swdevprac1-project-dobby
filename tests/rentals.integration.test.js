const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const mongoose = require('mongoose');
const User = require('../models/User');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { vehicleInput, bookingInput } = require('./fixtures/rentals');
const { serializeBooking } = require('../serializers/bookings');
const { serializeVehicle } = require('../serializers/vehicles');

test('rental models persist indexes, fixed fields and booked snapshots', async (t) => {
  const uri = process.env.TEST_MONGO_URI_B;
  let databaseName;
  try {
    databaseName = new URL(uri).pathname.slice(1);
  } catch {
    throw new Error('Set TEST_MONGO_URI_B to a dedicated dobby_test_b replica-set database.');
  }
  if (databaseName !== 'dobby_test_b') {
    throw new Error('TEST_MONGO_URI_B must name only dobby_test_b.');
  }

  const suffix = randomUUID();
  const userIds = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
  const providerIds = Array.from({ length: 2 }, () => new mongoose.Types.ObjectId());
  const applicationIds = Array.from({ length: 2 }, () => new mongoose.Types.ObjectId());
  const vehicleIds = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());
  const bookingId = new mongoose.Types.ObjectId();

  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await Booking.deleteOne({ _id: bookingId });
        await Vehicle.deleteMany({ _id: { $in: vehicleIds } });
        await ProviderApplication.deleteMany({ _id: { $in: applicationIds } });
        await Provider.deleteMany({ _id: { $in: providerIds } });
        await User.deleteMany({ _id: { $in: userIds } });
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  await mongoose.connect(uri);
  for (const Model of [User, Provider, ProviderApplication, Vehicle, Booking]) {
    await Model.createIndexes();
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await User.create([{
        _id: userIds[0], name: 'Synthetic Customer', telephone: '123456789',
        email: `customer-${suffix}@example.test`, passwordHash: 'synthetic-password', role: 'user',
      }], { session });
      for (let index = 0; index < 2; index++) {
        await User.create([{
          _id: userIds[index + 1], name: 'Synthetic Representative', telephone: '123456789',
          email: `company-${index}-${suffix}@example.test`, passwordHash: 'synthetic-password',
          role: 'company', providerId: providerIds[index],
        }], { session });
        await Provider.create([{
          _id: providerIds[index], representativeId: userIds[index + 1],
          businessRegistrationNumber: `REG-${index}-${suffix}`, status: 'approved',
          latestApplicationId: applicationIds[index], approvedApplicationId: applicationIds[index],
        }], { session });
        await ProviderApplication.create([{
          _id: applicationIds[index], providerId: providerIds[index], version: 1,
          businessRegistrationNumber: `REG-${index}-${suffix}`, status: 'approved',
          profile: {
            legalName: 'Synthetic Rentals', registeredAddress: '1 Test Road', telephone: '123456789',
            contactEmail: `contact-${index}-${suffix}@example.test`, documentUrl: 'https://example.test/document',
          },
        }], { session });
      }
    });
  } finally {
    await session.endSession();
  }

  const vin = `VIN-${suffix}`;
  let vehicle = await Vehicle.create(vehicleInput({ _id: vehicleIds[0], providerId: providerIds[0], vin }));
  const bookingData = bookingInput({
    _id: bookingId, userId: userIds[0], providerId: providerIds[0], vehicleId: vehicle._id,
  });
  bookingData.vehicleSnapshot.vin = vin.toUpperCase();
  let booking = await Booking.create(bookingData);

  await t.test('indexes are built and concurrent normalized VIN inserts leave one record', async () => {
    const vehicleIndexes = await Vehicle.listIndexes();
    assert.ok(vehicleIndexes.some((index) => index.name === 'uq_vehicle_vin' && index.unique));
    const bookingIndexes = await Booking.listIndexes();
    for (const key of [
      { userId: 1, state: 1, dueDate: 1 },
      { vehicleId: 1, state: 1, startDate: 1, dueDate: 1 },
      { providerId: 1, state: 1, dueDate: 1 },
      { userId: 1, createdAt: -1, _id: -1 },
      { providerId: 1, createdAt: -1, _id: -1 },
    ]) {
      assert.ok(bookingIndexes.some((index) => JSON.stringify(index.key) === JSON.stringify(key)));
    }
    const raceVin = `R-${suffix}`;
    const results = await Promise.allSettled([
      Vehicle.create(vehicleInput({ _id: vehicleIds[1], providerId: providerIds[0], vin: raceVin.toLowerCase() })),
      Vehicle.create(vehicleInput({ _id: vehicleIds[2], providerId: providerIds[1], vin: ` ${raceVin.toUpperCase()} ` })),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const failure = results.find((result) => result.status === 'rejected').reason;
    assert.equal(failure.code, 11000);
    assert.match(failure.message, /uq_vehicle_vin/);
    assert.equal(await Vehicle.countDocuments({ vin: raceVin.toUpperCase() }), 1);

    vehicle.isActive = false;
    await vehicle.save();
    await assert.rejects(Vehicle.create(vehicleInput({ _id: vehicleIds[3], providerId: providerIds[1], vin: vin.toLowerCase() })), {
      code: 11000,
    });
    assert.equal(await Vehicle.countDocuments({ vin: vin.toUpperCase() }), 1);
  });

  await t.test('listing edits persist but identity changes and booked snapshot changes do not', async () => {
    vehicle.providerId = providerIds[1];
    vehicle.vin = 'FORGED-VIN';
    vehicle.model = 'Changed';
    vehicle.brand = 'Changed';
    vehicle.modelYear = 2040;
    vehicle.transmissionType = 'manual';
    vehicle.fuelType = 'petrol';
    vehicle.seatingCapacity = 2;
    vehicle.pickupBranch.name = 'Branch B';
    vehicle.pickupBranch.address = '2 Test Road';
    vehicle.ratePerDaySatang = 120_000;
    await vehicle.save();
    vehicle = await Vehicle.findById(vehicle._id);
    assert.equal(String(vehicle.providerId), String(providerIds[0]));
    assert.equal(vehicle.vin, vin.toUpperCase());
    assert.equal(vehicle.model, 'City');
    assert.equal(vehicle.brand, 'Example Motors');
    assert.equal(vehicle.modelYear, 2030);
    assert.equal(vehicle.transmissionType, 'automatic');
    assert.equal(vehicle.fuelType, 'hybrid');
    assert.equal(vehicle.seatingCapacity, 5);
    assert.equal(vehicle.pickupBranch.name, 'Branch B');
    assert.equal(vehicle.ratePerDaySatang, 120_000);

    booking = await Booking.findById(bookingId);
    assert.equal(booking.vehicleSnapshot.pickupBranch.name, 'Branch A');
    assert.equal(booking.ratePerDaySatang, 100_000);
    booking.userId = userIds[1];
    booking.providerId = providerIds[1];
    booking.vehicleId = vehicleIds[1];
    booking.ratePerDaySatang = 120_000;
    booking.vehicleSnapshot.model = 'Changed';
    booking.vehicleSnapshot.pickupBranch.name = 'Changed';
    booking.vehicleSnapshot.pickupBranch.address = 'Changed';
    booking.startDate = '2030-01-20';
    booking.dueDate = '2030-01-21';
    booking.rentalDays = 2;
    booking.totalPriceSatang = 200_000;
    await booking.save();
    booking = await Booking.findById(bookingId);
    assert.equal(String(booking.userId), String(userIds[0]));
    assert.equal(String(booking.providerId), String(providerIds[0]));
    assert.equal(String(booking.vehicleId), String(vehicleIds[0]));
    assert.equal(booking.ratePerDaySatang, 100_000);
    assert.equal(booking.totalPriceSatang, 200_000);
    assert.equal(booking.vehicleSnapshot.model, 'City');
    assert.equal(booking.vehicleSnapshot.pickupBranch.name, 'Branch A');
    assert.equal(booking.vehicleSnapshot.pickupBranch.address, '1 Test Road');
  });

  await t.test('query updates keep immutable fields and snapshots fixed', async () => {
    await Vehicle.updateOne({ _id: vehicle._id }, { $set: {
      vin: 'FORGED-VIN', providerId: providerIds[1], ratePerDaySatang: 130_000,
    } }, { runValidators: true });
    await Booking.updateOne({ _id: bookingId }, { $set: {
      ratePerDaySatang: 1, 'vehicleSnapshot.pickupBranch.name': 'Changed', state: 'confirmed',
    } }, { runValidators: true });
    vehicle = await Vehicle.findById(vehicle._id);
    booking = await Booking.findById(bookingId);
    assert.equal(vehicle.vin, vin.toUpperCase());
    assert.equal(String(vehicle.providerId), String(providerIds[0]));
    assert.equal(vehicle.ratePerDaySatang, 130_000);
    assert.equal(booking.ratePerDaySatang, 100_000);
    assert.equal(booking.vehicleSnapshot.pickupBranch.name, 'Branch A');
    booking.totalPriceSatang = 1;
    await assert.rejects(booking.save(), { name: 'ValidationError' });
    assert.equal((await Booking.findById(bookingId)).totalPriceSatang, 200_000);
  });

  await t.test('safe output uses current customer contact without exposing hashes or internal fields', async () => {
    await User.updateOne({ _id: userIds[0] }, { $set: { name: 'Updated Customer' } });
    const customer = await User.findById(userIds[0]).select('name email telephone');
    assert.equal(customer.passwordHash, undefined);
    const dto = serializeBooking(await Booking.findById(bookingId), customer, '2030-01-20');
    assert.equal(dto.customer.name, 'Updated Customer');
    assert.deepEqual(Object.keys(dto.customer).sort(), ['email', 'id', 'name', 'telephone']);
    assert.equal(dto.customer.passwordHash, undefined);
    assert.equal(dto.state, undefined);
    const vehicleDto = serializeVehicle(vehicle);
    assert.equal(vehicleDto.revision, undefined);
    assert.equal(vehicleDto.__v, undefined);
  });
});
