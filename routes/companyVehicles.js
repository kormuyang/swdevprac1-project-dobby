const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { rejectBody, rejectQuery } = require('../middleware/validateRequest');
const { parseJson, validateBody, validateQuery, validateId, approvedCompany, jsonErrors } = require('../middleware/rentalValidation');
const validators = require('../validators/vehicles');
const controller = require('../controllers/vehicles');

const router = express.Router();
router.use(protect(), authorize('company'), approvedCompany, parseJson);
router.get('/', rejectBody, validateQuery(validators.validateOwnVehicleFilters), controller.listOwnVehicles);
router.post('/', rejectQuery, validateBody(validators.validateVehicleCreate), controller.createVehicle);
router.get('/:vehicleId', rejectBody, rejectQuery, validateId('vehicleId'), controller.getOwnVehicle);
router.patch('/:vehicleId', rejectQuery, validateId('vehicleId'), validateBody(validators.validateVehicleUpdate), controller.updateVehicle);
router.patch('/:vehicleId/availability', rejectQuery, validateId('vehicleId'), validateBody(validators.validateAvailabilityUpdate), controller.updateAvailability);
router.patch('/:vehicleId/activation', rejectQuery, validateId('vehicleId'), validateBody(validators.validateActivationUpdate), controller.setVehicleActivation);
router.use(jsonErrors);
module.exports = router;
