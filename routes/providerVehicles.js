const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listOwnVehicles,
  createVehicle,
  getOwnVehicle,
  updateVehicle,
  updateAvailability,
  setVehicleActivation,
} = require('../controllers/vehicles');

const router = express.Router();
router.use(protect(), authorize('provider'));
router.get('/', listOwnVehicles);
router.post('/', createVehicle);
router.get('/:vehicleId', getOwnVehicle);
router.patch('/:vehicleId', updateVehicle);
router.patch('/:vehicleId/availability', updateAvailability);
router.patch('/:vehicleId/activation', setVehicleActivation);

module.exports = router;
