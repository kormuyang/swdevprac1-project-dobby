const express = require('express');
const {
  listPublicProviders,
  getPublicProvider,
  listPublicVehicles,
  getPublicVehicle,
} = require('../controllers/vehicles');

const router = express.Router();
router.get('/providers', listPublicProviders);
router.get('/providers/:providerId', getPublicProvider);
router.get('/vehicles', listPublicVehicles);
router.get('/vehicles/:vehicleId', getPublicVehicle);

module.exports = router;
