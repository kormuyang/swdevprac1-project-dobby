const { rejectBody, rejectQuery } = require('../validators/request');
const { todayBangkok } = require('../utils/dates');
const { objectIdField } = require('../validators/fields');
const {
  validatePublicProviderFilters,
  validatePublicVehicleFilters,
  validateOwnVehicleFilters,
  validateVehicleCreate,
  validateVehicleUpdate,
  validateAvailabilityUpdate,
  validateActivationUpdate,
} = require('../validators/vehicles');
const Vehicle = require('../models/Vehicle');
const { requireApprovedProvider } = require('../services/providerAccess');
const service = require('../services/vehicles');
const { serializeVehicle } = require('../serializers/vehicles');

function serializePublicProvider(provider) {
  const profile = provider.approvedApplication.profile;
  return {
    id: String(provider._id),
    name: profile.legalName,
    address: profile.registeredAddress,
    telephone: profile.telephone,
  };
}

async function listPublicProviders(req, res) {
  try {
    rejectBody(req);
    const filters = validatePublicProviderFilters(req.query);
    const result = await service.listPublicProviders(filters);
    return res.json({ success: true, ...result, data: result.data.map(serializePublicProvider) });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function getPublicProvider(req, res) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const providerId = objectIdField(req.params.providerId, 'providerId');
    const provider = await service.getPublicProvider(providerId);
    const data = serializePublicProvider(provider);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function listPublicVehicles(req, res) {
  try {
    rejectBody(req);
    const filters = validatePublicVehicleFilters(req.query, todayBangkok(new Date()));
    const result = await service.listPublicVehicles(filters);
    return res.json({ success: true, ...result, data: result.data.map(serializeVehicle) });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function getPublicVehicle(req, res) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const vehicle = await service.getPublicVehicle(vehicleId);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function listOwnVehicles(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectBody(req);
    const filters = validateOwnVehicleFilters(req.query);
    const filter = { providerId: req.actor.providerId };
    if (filters.isActive !== undefined) {
      filter.isActive = filters.isActive;
    }
    const total = await Vehicle.countDocuments(filter);
    const vehicles = await Vehicle.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit);
    const data = vehicles.map(serializeVehicle);
    return res.json({
      success: true,
      data,
      count: data.length,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function getOwnVehicle(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectBody(req);
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      providerId: req.actor.providerId,
    });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'The vehicle was not found.' });
    }
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function createVehicle(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectQuery(req);
    const input = validateVehicleCreate(req.body);
    const vehicle = await service.createVehicle(input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function updateVehicle(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const input = validateVehicleUpdate(req.body);
    const vehicle = await service.updateVehicle(vehicleId, input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function updateAvailability(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const input = validateAvailabilityUpdate(req.body);
    const vehicle = await service.updateAvailability(vehicleId, input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

async function setVehicleActivation(req, res) {
  try {
    await requireApprovedProvider(req.actor);
    rejectQuery(req);
    const vehicleId = objectIdField(req.params.vehicleId, 'vehicleId');
    const input = validateActivationUpdate(req.body);
    const vehicle = await service.setVehicleActivation(vehicleId, input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'The request could not be completed.',
    });
  }
}

module.exports = {
  listPublicProviders,
  getPublicProvider,
  listPublicVehicles,
  getPublicVehicle,
  listOwnVehicles,
  getOwnVehicle,
  createVehicle,
  updateVehicle,
  updateAvailability,
  setVehicleActivation,
};
