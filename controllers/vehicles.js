const AppError = require('../utils/AppError');
const Vehicle = require('../models/Vehicle');
const service = require('../services/vehicles');
const { serializeVehicle } = require('../serializers/vehicles');

async function listPublicVehicles(req, res, next) {
  try {
    const filters = req.validated.query;
    const result = await service.listPublicVehicles(filters);
    return res.json({ success: true, ...result, data: result.data.map(serializeVehicle) });
  } catch (error) {
    return next(error);
  }
}

async function getPublicVehicle(req, res, next) {
  try {
    const vehicleId = req.validated.params.vehicleId;
    const vehicle = await service.getPublicVehicle(vehicleId);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listOwnVehicles(req, res, next) {
  try {
    const filters = req.validated.query;
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
    return next(error);
  }
}

async function getOwnVehicle(req, res, next) {
  try {
    const vehicleId = req.validated.params.vehicleId;
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      providerId: req.actor.providerId,
    });
    if (!vehicle) {
      throw new AppError(404, 'The vehicle was not found.');
    }
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createVehicle(req, res, next) {
  try {
    const input = req.validated.body;
    const vehicle = await service.createVehicle(input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const vehicleId = req.validated.params.vehicleId;
    const input = req.validated.body;
    const vehicle = await service.updateVehicle(vehicleId, input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateAvailability(req, res, next) {
  try {
    const vehicleId = req.validated.params.vehicleId;
    const input = req.validated.body;
    const vehicle = await service.updateAvailability(vehicleId, input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function setVehicleActivation(req, res, next) {
  try {
    const vehicleId = req.validated.params.vehicleId;
    const input = req.validated.body;
    const vehicle = await service.setVehicleActivation(vehicleId, input, req.actor);
    const data = serializeVehicle(vehicle);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPublicVehicles,
  getPublicVehicle,
  listOwnVehicles,
  getOwnVehicle,
  createVehicle,
  updateVehicle,
  updateAvailability,
  setVehicleActivation,
};
