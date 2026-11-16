const express = require('express');
const {
  validateListPublicVehicles,
  validateGetPublicVehicle,
} = require('../middleware/vehiclesValidation');
const { listPublicVehicles, getPublicVehicle } = require('../controllers/vehicles');

const router = express.Router();

router.route('/').get(validateListPublicVehicles, listPublicVehicles);

router.route('/:vehicleId').get(validateGetPublicVehicle, getPublicVehicle);

module.exports = router;
