const service = require('../services/vehicles');
const { serializeVehicle } = require('../serializers/vehicles');

function sendError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({ success: false,
    message: status < 500 ? error.message : 'The request could not be completed.' });
}

function serializePublicProvider(provider) {
  const profile = provider.approvedApplication.profile;
  return { id: String(provider._id), name: profile.legalName,
    address: profile.registeredAddress, telephone: profile.telephone };
}

async function listPublicProviders(req, res) {
  try {
    const result = await service.listPublicProviders(req.filters);
    return res.json({ success: true, ...result, data: result.data.map(serializePublicProvider) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function getPublicProvider(req, res) {
  try {
    return res.json({ success: true, data: serializePublicProvider(await service.getPublicProvider(req.resourceId)) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function listPublicVehicles(req, res) {
  try {
    const result = await service.listPublicVehicles(req.filters);
    return res.json({ success: true, ...result, data: result.data.map(serializeVehicle) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function getPublicVehicle(req, res) {
  try {
    return res.json({ success: true, data: serializeVehicle(await service.getPublicVehicle(req.resourceId)) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function listOwnVehicles(req, res) {
  try {
    const result = await service.listOwnVehicles(req.filters, { actor: req.actor });
    return res.json({ success: true, ...result, data: result.data.map(serializeVehicle) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function getOwnVehicle(req, res) {
  try {
    const vehicle = await service.getOwnVehicle(req.resourceId, { actor: req.actor });
    return res.json({ success: true, data: serializeVehicle(vehicle) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function createVehicle(req, res) {
  try {
    const vehicle = await service.createVehicle(req.input, { actor: req.actor });
    return res.status(201).json({ success: true, data: serializeVehicle(vehicle) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function updateVehicle(req, res) {
  try {
    const vehicle = await service.updateVehicle(req.resourceId, req.input, { actor: req.actor });
    return res.json({ success: true, data: serializeVehicle(vehicle) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function updateAvailability(req, res) {
  try {
    const vehicle = await service.updateAvailability(req.resourceId, req.input, { actor: req.actor });
    return res.json({ success: true, data: serializeVehicle(vehicle) });
  } catch (error) {
    return sendError(res, error);
  }
}
async function setVehicleActivation(req, res) {
  try {
    const vehicle = await service.setVehicleActivation(req.resourceId, req.input, { actor: req.actor });
    return res.json({ success: true, data: serializeVehicle(vehicle) });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = { listPublicProviders, getPublicProvider, listPublicVehicles, getPublicVehicle,
  listOwnVehicles, getOwnVehicle, createVehicle, updateVehicle, updateAvailability, setVehicleActivation };
