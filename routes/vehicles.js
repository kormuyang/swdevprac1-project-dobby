const {
  validateListPublicVehicles,
  validateGetPublicVehicle,
  validateListOwnVehicles,
  validateGetOwnVehicle,
  validateCreateVehicle,
  validateUpdateVehicle,
  validateUpdateAvailability,
  validateSetVehicleActivation,
} = require('../middleware/vehiclesValidation');
const { approvedProvider } = require('../middleware/approvedProvider');
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

router.route('/vehicles').get(validateListPublicVehicles, listPublicVehicles);
router.route('/vehicles/:vehicleId').get(validateGetPublicVehicle, getPublicVehicle);

router
  .route('/provider/vehicles')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateListOwnVehicles, listOwnVehicles)
  .post(validateCreateVehicle, createVehicle);
router
  .route('/provider/vehicles/:vehicleId')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateGetOwnVehicle, getOwnVehicle)
  .patch(validateUpdateVehicle, updateVehicle);
router
  .route('/provider/vehicles/:vehicleId/availability')
  .all(protect(), authorize('provider'), approvedProvider)
  .patch(validateUpdateAvailability, updateAvailability);
router
  .route('/provider/vehicles/:vehicleId/activation')
  .all(protect(), authorize('provider'), approvedProvider)
  .patch(validateSetVehicleActivation, setVehicleActivation);

module.exports = router;
