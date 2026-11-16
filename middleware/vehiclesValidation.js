const { rejectBody, rejectQuery } = require('../validators/request');
const { todayBangkok } = require('../utils/dates');
const { objectIdField } = require('../validators/fields');
const {
  validatePublicVehicleFilters,
  validateOwnVehicleFilters,
  validateVehicleCreate,
  validateVehicleUpdate,
  validateAvailabilityUpdate,
  validateActivationUpdate,
} = require('../validators/vehicles');

function validateListPublicVehicles(req, res, next) {
  try {
    rejectBody(req);
    const filters = validatePublicVehicleFilters(req.query, todayBangkok(new Date()));
    req.validated = { query: filters };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetPublicVehicle(req, res, next) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    req.validated = { params: { vehicleId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateListOwnVehicles(req, res, next) {
  try {
    rejectBody(req);
    const filters = validateOwnVehicleFilters(req.query);
    req.validated = { query: filters };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetOwnVehicle(req, res, next) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    req.validated = { params: { vehicleId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCreateVehicle(req, res, next) {
  try {
    rejectQuery(req);
    const input = validateVehicleCreate(req.body);
    req.validated = { body: input };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateVehicle(req, res, next) {
  try {
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const input = validateVehicleUpdate(req.body);
    req.validated = { body: input, params: { vehicleId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateUpdateAvailability(req, res, next) {
  try {
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const input = validateAvailabilityUpdate(req.body);
    req.validated = { body: input, params: { vehicleId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateSetVehicleActivation(req, res, next) {
  try {
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const input = validateActivationUpdate(req.body);
    req.validated = { body: input, params: { vehicleId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateListPublicVehicles,
  validateGetPublicVehicle,
  validateListOwnVehicles,
  validateGetOwnVehicle,
  validateCreateVehicle,
  validateUpdateVehicle,
  validateUpdateAvailability,
  validateSetVehicleActivation,
};
