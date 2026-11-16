const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const { vehicleInput } = require('./fixtures/rentals');
const {
  validateVehicleCreate,
  validateVehicleUpdate,
  validateAvailabilityUpdate,
  validateActivationUpdate,
} = require('../validators/vehicles');
const { serializeVehicle, serializeVehicleSnapshot } = require('../serializers/vehicles');
const { objectIdField } = require('../validators/fields');
const { components } = require('../docs/contracts/openapi.json');

function createRequest(overrides = {}) {
  const { providerId, ...body } = vehicleInput(overrides);
  return body;
}

test('vehicle input normalizes allowed fields and never accepts ownership or internal fields', () => {
  const body = createRequest({ vin: ' synthetic-vin-001 ', model: ' City ' });
  const input = validateVehicleCreate(body);
  assert.equal(input.vin, 'SYNTHETIC-VIN-001');
  assert.equal(input.model, 'City');
  assert.notEqual(input.pickupBranch, body.pickupBranch);
  for (const field of ['providerId', 'revision', 'isActive', '_id', 'bookings']) {
    assert.throws(() => validateVehicleCreate({ ...body, [field]: 'forged' }), { status: 400 });
  }
  const { availableUntil, brand, modelYear, ...minimal } = body;
  assert.equal(validateVehicleCreate(minimal).availableUntil, null);
  assert.equal(Object.hasOwn(validateVehicleCreate(minimal), 'brand'), false);
});

test('vehicle validators reject wrong types, invalid limits and unknown nested fields', () => {
  const invalidValues = [
    { seatingCapacity: '5' },
    { seatingCapacity: 1.5 },
    { seatingCapacity: 0 },
    { seatingCapacity: 21 },
    { ratePerDaySatang: 0 },
    { ratePerDaySatang: 1.5 },
    { ratePerDaySatang: 1_000_000_001 },
    { modelYear: 1899 },
    { modelYear: 2101 },
    { modelYear: 2030.5 },
    { brand: null },
    { brand: ' ' },
    { vin: 'short' },
    { vin: 'ß'.repeat(21) },
    { model: { $ne: null } },
    { transmissionType: 'other' },
    { fuelType: 'water' },
    { pickupBranch: { name: 'A', address: 'Road', documentUrl: 'private' } },
    { pickupBranch: { name: 'A' } },
    { pickupBranch: [] },
  ];
  for (const invalid of invalidValues) {
    assert.throws(() => validateVehicleCreate(createRequest(invalid)), { status: 400 });
  }
  for (const body of [null, [], 'car']) {
    assert.throws(() => validateVehicleCreate(body), { status: 400 });
  }
});

test('vehicle updates allow only branch/rate, with separate window and activation inputs', () => {
  assert.deepEqual(validateVehicleUpdate({ ratePerDaySatang: 120_000 }), {
    ratePerDaySatang: 120_000,
  });
  assert.deepEqual(validateVehicleUpdate({ pickupBranch: { name: ' B ', address: ' Road ' } }), {
    pickupBranch: { name: 'B', address: 'Road' },
  });
  for (const body of [
    {},
    { vin: 'NEW-VIN' },
    { model: 'Changed' },
    { seatingCapacity: 4 },
    { isActive: false },
    { pickupBranch: { name: 'B' } },
  ]) {
    assert.throws(() => validateVehicleUpdate(body), { status: 400 });
  }
  assert.deepEqual(validateActivationUpdate({ isActive: false }), { isActive: false });
  assert.throws(() => validateActivationUpdate({ isActive: 'false' }), { status: 400 });
  assert.throws(() => validateActivationUpdate({ isActive: true, providerId: 'forged' }), {
    status: 400,
  });
  assert.throws(() => validateActivationUpdate({}), { status: 400 });
});

test('offering periods permit historical starts and long ranges but reject missing/reversed dates', () => {
  assert.deepEqual(
    validateAvailabilityUpdate({ availableFrom: '2020-01-01', availableUntil: null }),
    {
      availableFrom: '2020-01-01',
      availableUntil: null,
    },
  );
  assert.equal(
    validateAvailabilityUpdate({ availableFrom: '2030-01-01', availableUntil: '2031-01-01' })
      .availableUntil,
    '2031-01-01',
  );
  for (const body of [
    { availableFrom: '2030-01-01' },
    { availableFrom: '2030-02-01', availableUntil: '2030-01-01' },
    { availableFrom: '2030-02-30', availableUntil: null },
    { availableFrom: '2030-01-01', availableUntil: '' },
  ]) {
    assert.throws(() => validateAvailabilityUpdate(body), { status: 400 });
  }
});

test('vehicle model validates fields without opening a database connection', async () => {
  const vehicle = new Vehicle(vehicleInput({ vin: ' synthetic-vin-001 ' }));
  await vehicle.validate();
  assert.equal(vehicle.vin, 'SYNTHETIC-VIN-001');
  assert.equal(vehicle.revision, 0);
  assert.equal(vehicle.isActive, true);
  assert.equal(vehicle.availableUntil, null);
  assert.equal(mongoose.connection.readyState, 0);
  for (const invalid of [
    { providerId: null },
    { model: '' },
    { brand: null },
    { modelYear: 2030.5 },
    { transmissionType: 'other' },
    { fuelType: 'water' },
    { seatingCapacity: 2.5 },
    { ratePerDaySatang: 1.5 },
    { availableFrom: '2030-02-30' },
    { availableUntil: '2029-01-01' },
    { revision: -1 },
  ]) {
    await assert.rejects(new Vehicle(vehicleInput(invalid)).validate(), {
      name: 'ValidationError',
    });
  }
});

test('vehicle serializers match OpenAPI fields and copy nested objects without private data', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const vehicle = {
    ...vehicleInput(),
    _id: new mongoose.Types.ObjectId(),
    createdAt: now,
    updatedAt: now,
    isActive: true,
    revision: 9,
    __v: 2,
    bookings: ['private'],
    documentUrl: 'private',
    pickupBranch: { name: 'Branch A', address: 'Road', secret: 'private' },
  };
  const dto = serializeVehicle(vehicle);
  assert.deepEqual(
    Object.keys(dto).sort(),
    Object.keys(components.schemas.Vehicle.properties).sort(),
  );
  assert.deepEqual(dto.pickupBranch, { name: 'Branch A', address: 'Road' });
  assert.equal(dto.providerId, String(vehicle.providerId));
  assert.equal(dto.createdAt, now.toISOString());
  dto.pickupBranch.name = 'Changed';
  assert.equal(vehicle.pickupBranch.name, 'Branch A');
  const snapshot = serializeVehicleSnapshot(vehicle);
  assert.deepEqual(
    Object.keys(snapshot).sort(),
    Object.keys(components.schemas.VehicleSnapshot.properties).sort(),
  );
  const { brand, modelYear, ...minimal } = vehicle;
  const minimalDto = serializeVehicle(minimal);
  for (const field of components.schemas.Vehicle.required) {
    assert.ok(Object.hasOwn(minimalDto, field), field);
  }
  assert.equal(Object.hasOwn(minimalDto, 'brand'), false);
  assert.equal(Object.hasOwn(minimalDto, 'modelYear'), false);
});

test('rental IDs accept only 24 hexadecimal characters and normalize case', () => {
  assert.equal(objectIdField('ABCDEF0123456789ABCDEF01', 'vehicleId'), 'abcdef0123456789abcdef01');
  for (const value of [null, [], { $ne: null }, 'short', '507f1f77bcf86cd799439011\n']) {
    assert.throws(() => objectIdField(value, 'vehicleId'), { status: 400 });
  }
});
