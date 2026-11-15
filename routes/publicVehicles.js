const express = require('express');
const controller = require('../controllers/vehicles');
const { rejectBody, rejectQuery } = require('../middleware/validateRequest');
const { parseJson, validateQuery, validateId, jsonErrors } = require('../middleware/rentalValidation');
const { validatePublicProviderFilters, validatePublicVehicleFilters } = require('../validators/vehicles');

const router = express.Router();
router.get('/providers', parseJson, rejectBody, validateQuery(validatePublicProviderFilters), controller.listPublicProviders);
router.get('/providers/:providerId', parseJson, rejectBody, rejectQuery, validateId('providerId'), controller.getPublicProvider);
router.get('/vehicles', parseJson, rejectBody, validateQuery(validatePublicVehicleFilters), controller.listPublicVehicles);
router.get('/vehicles/:vehicleId', parseJson, rejectBody, rejectQuery, validateId('vehicleId'), controller.getPublicVehicle);
router.use(jsonErrors);
module.exports = router;
