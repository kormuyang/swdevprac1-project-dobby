const { inclusiveDays, validateDateOnly } = require('../utils/dates');
const { requireObject, rejectUnknownFields, stringField, integerField, enumField } = require('./fields');

function validateBranch(value) {
  requireObject(value, 'pickupBranch');
  rejectUnknownFields(value, ['name', 'address'], 'pickupBranch');
  return {
    name: stringField(value.name, 'pickupBranch.name', { min: 1, max: 120 }),
    address: stringField(value.address, 'pickupBranch.address', { min: 1, max: 500 }),
  };
}

function validateOfferingPeriod(availableFrom, availableUntil) {
  validateDateOnly(availableFrom);
  if (availableUntil !== null) {
    inclusiveDays(availableFrom, availableUntil);
  }
  return { availableFrom, availableUntil };
}

function validateVehicleCreate(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, [
    'vin', 'brand', 'model', 'modelYear', 'transmissionType', 'fuelType',
    'seatingCapacity', 'pickupBranch', 'ratePerDaySatang', 'availableFrom', 'availableUntil',
  ], 'request');
  const availableUntil = body.availableUntil === undefined ? null : body.availableUntil;
  const input = {
    vin: stringField(body.vin, 'vin', { min: 6, max: 40, uppercase: true }),
    model: stringField(body.model, 'model', { min: 1, max: 120 }),
    transmissionType: enumField(body.transmissionType, 'transmissionType', ['automatic', 'manual']),
    fuelType: enumField(body.fuelType, 'fuelType', ['petrol', 'diesel', 'hybrid', 'electric', 'other']),
    seatingCapacity: integerField(body.seatingCapacity, 'seatingCapacity', 1, 20),
    pickupBranch: validateBranch(body.pickupBranch),
    ratePerDaySatang: integerField(body.ratePerDaySatang, 'ratePerDaySatang', 1, 1_000_000_000),
    ...validateOfferingPeriod(body.availableFrom, availableUntil),
  };
  if (body.brand !== undefined) {
    input.brand = stringField(body.brand, 'brand', { min: 1, max: 80 });
  }
  if (body.modelYear !== undefined) {
    input.modelYear = integerField(body.modelYear, 'modelYear', 1900, 2100);
  }
  return input;
}

function validateVehicleUpdate(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, ['pickupBranch', 'ratePerDaySatang'], 'request');
  if (Object.keys(body).length === 0) {
    const error = new Error('Provide a pickup branch or daily rate to update.');
    error.status = 400;
    throw error;
  }
  const input = {};
  if (Object.hasOwn(body, 'pickupBranch')) {
    input.pickupBranch = validateBranch(body.pickupBranch);
  }
  if (Object.hasOwn(body, 'ratePerDaySatang')) {
    input.ratePerDaySatang = integerField(body.ratePerDaySatang, 'ratePerDaySatang', 1, 1_000_000_000);
  }
  return input;
}

function validateAvailabilityUpdate(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, ['availableFrom', 'availableUntil'], 'request');
  return validateOfferingPeriod(body.availableFrom, body.availableUntil);
}

function validateActivationUpdate(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, ['isActive'], 'request');
  if (typeof body.isActive !== 'boolean') {
    const error = new Error('isActive must be a boolean.');
    error.status = 400;
    throw error;
  }
  return { isActive: body.isActive };
}

module.exports = {
  validateVehicleCreate,
  validateVehicleUpdate,
  validateAvailabilityUpdate,
  validateActivationUpdate,
};
