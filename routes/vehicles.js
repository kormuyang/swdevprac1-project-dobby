const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listPublicVehicles,
  getPublicVehicle,
  listOwnVehicles,
  createVehicle,
  getOwnVehicle,
  updateVehicle,
  updateAvailability,
  setVehicleActivation,
} = require('../controllers/vehicles');

const router = express.Router();

router.route('/vehicles').get(listPublicVehicles);
router.route('/vehicles/:vehicleId').get(getPublicVehicle);

router
  .route('/provider/vehicles')
  .all(protect(), authorize('provider'))
  .get(listOwnVehicles)
  .post(createVehicle);
router
  .route('/provider/vehicles/:vehicleId')
  .all(protect(), authorize('provider'))
  .get(getOwnVehicle)
  .patch(updateVehicle);
router
  .route('/provider/vehicles/:vehicleId/availability')
  .all(protect(), authorize('provider'))
  .patch(updateAvailability);
router
  .route('/provider/vehicles/:vehicleId/activation')
  .all(protect(), authorize('provider'))
  .patch(setVehicleActivation);

module.exports = router;
