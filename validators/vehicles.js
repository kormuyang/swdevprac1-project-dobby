const AppError = require('../utils/AppError');
const { inclusiveDays, validateDateOnly } = require('../utils/dates');
const {
  requireObject,
  rejectUnknownFields,
  stringField,
  integerField,
  enumField,
  objectIdField,
} = require('./fields');
const { listPage, queryInteger } = require('./rentalLists');
const { validateRentalDates } = require('../utils/dates');

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
  rejectUnknownFields(
    body,
    [
      'vin',
      'brand',
      'model',
      'modelYear',
      'transmissionType',
      'fuelType',
      'seatingCapacity',
      'pickupBranch',
      'ratePerDaySatang',
      'availableFrom',
      'availableUntil',
    ],
    'request',
  );
  const availableUntil = body.availableUntil === undefined ? null : body.availableUntil;
  const input = {
    vin: stringField(body.vin, 'vin', { min: 6, max: 40, uppercase: true }),
    model: stringField(body.model, 'model', { min: 1, max: 120 }),
    transmissionType: enumField(body.transmissionType, 'transmissionType', ['automatic', 'manual']),
    fuelType: enumField(body.fuelType, 'fuelType', [
      'petrol',
      'diesel',
      'hybrid',
      'electric',
      'other',
    ]),
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
    throw new AppError(400, 'Provide a pickup branch or daily rate to update.');
  }
  const input = {};
  if (Object.hasOwn(body, 'pickupBranch')) {
    input.pickupBranch = validateBranch(body.pickupBranch);
  }
  if (Object.hasOwn(body, 'ratePerDaySatang')) {
    input.ratePerDaySatang = integerField(
      body.ratePerDaySatang,
      'ratePerDaySatang',
      1,
      1_000_000_000,
    );
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
    throw new AppError(400, 'isActive must be a boolean.');
  }
  return { isActive: body.isActive };
}

function validatePublicProviderFilters(query) {
  return listPage(query);
}

function validatePublicVehicleFilters(query, today) {
  const result = listPage(query, [
    'providerId',
    'brand',
    'model',
    'transmissionType',
    'fuelType',
    'minSeats',
    'minRatePerDaySatang',
    'maxRatePerDaySatang',
    'startDate',
    'dueDate',
    'sort',
  ]);
  if (query.providerId !== undefined) {
    result.providerId = objectIdField(query.providerId, 'providerId');
  }
  for (const [field, max] of [
    ['brand', 80],
    ['model', 120],
  ]) {
    if (query[field] !== undefined) {
      result[field] = stringField(query[field], field, { min: 1, max });
    }
  }
  if (query.transmissionType !== undefined) {
    result.transmissionType = enumField(query.transmissionType, 'transmissionType', [
      'automatic',
      'manual',
    ]);
  }
  if (query.fuelType !== undefined) {
    result.fuelType = enumField(query.fuelType, 'fuelType', [
      'petrol',
      'diesel',
      'hybrid',
      'electric',
      'other',
    ]);
  }
  for (const [field, max] of [
    ['minSeats', 20],
    ['minRatePerDaySatang', 1_000_000_000],
    ['maxRatePerDaySatang', 1_000_000_000],
  ]) {
    if (query[field] !== undefined) {
      result[field] = queryInteger(query[field], field, 1, max);
    }
  }
  if (result.minRatePerDaySatang > result.maxRatePerDaySatang) {
    throw new AppError(400, 'The minimum rate must not exceed the maximum rate.');
  }
  if (query.startDate !== undefined || query.dueDate !== undefined) {
    validateRentalDates(query.startDate, query.dueDate, today);
    result.startDate = query.startDate;
    result.dueDate = query.dueDate;
  }
  result.sort = '-createdAt';
  if (query.sort !== undefined) {
    result.sort = enumField(query.sort, 'sort', [
      'createdAt',
      '-createdAt',
      'ratePerDaySatang',
      '-ratePerDaySatang',
    ]);
  }
  return result;
}

function validateOwnVehicleFilters(query) {
  const result = listPage(query, ['isActive']);
  if (query.isActive !== undefined) {
    if (query.isActive !== 'true' && query.isActive !== 'false') {
      throw new AppError(400, 'isActive must be true or false.');
    }
    result.isActive = query.isActive === 'true';
  }
  return result;
}

module.exports = {
  validateVehicleCreate,
  validateVehicleUpdate,
  validateAvailabilityUpdate,
  validateActivationUpdate,
  validatePublicProviderFilters,
  validatePublicVehicleFilters,
  validateOwnVehicleFilters,
};
