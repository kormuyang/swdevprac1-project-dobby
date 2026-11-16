const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { approvedProvider } = require('../middleware/approvedProvider');
const {
  validateGetOwnProvider,
  validateListOwnApplications,
  validateGetOwnApplication,
  validateSubmitApplication,
} = require('../middleware/providersValidation');
const {
  validateListOwnVehicles,
  validateGetOwnVehicle,
  validateCreateVehicle,
  validateUpdateVehicle,
  validateUpdateAvailability,
  validateSetVehicleActivation,
} = require('../middleware/vehiclesValidation');
const {
  validateListProviderBookings,
  validateGetProviderBooking,
} = require('../middleware/bookingsValidation');
const {
  getOwnProvider,
  listOwnApplications,
  submitApplication,
  getOwnApplication,
} = require('../controllers/providers');
const {
  listOwnVehicles,
  createVehicle,
  getOwnVehicle,
  updateVehicle,
  updateAvailability,
  setVehicleActivation,
} = require('../controllers/vehicles');
const { listProviderBookings, getProviderBooking } = require('../controllers/bookings');

const router = express.Router();

router
  .route('/profile')
  .all(protect(), authorize('provider'))
  .get(validateGetOwnProvider, getOwnProvider);

router
  .route('/applications')
  .all(protect(), authorize('provider'))
  .get(validateListOwnApplications, listOwnApplications)
  .post(validateSubmitApplication, submitApplication);

router
  .route('/applications/:applicationId')
  .all(protect(), authorize('provider'))
  .get(validateGetOwnApplication, getOwnApplication);

router
  .route('/vehicles')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateListOwnVehicles, listOwnVehicles)
  .post(validateCreateVehicle, createVehicle);

router
  .route('/vehicles/:vehicleId')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateGetOwnVehicle, getOwnVehicle)
  .patch(validateUpdateVehicle, updateVehicle);

router
  .route('/vehicles/:vehicleId/availability')
  .all(protect(), authorize('provider'), approvedProvider)
  .patch(validateUpdateAvailability, updateAvailability);

router
  .route('/vehicles/:vehicleId/activation')
  .all(protect(), authorize('provider'), approvedProvider)
  .patch(validateSetVehicleActivation, setVehicleActivation);

router
  .route('/bookings')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateListProviderBookings, listProviderBookings);

router
  .route('/bookings/:bookingId')
  .all(protect(), authorize('provider'), approvedProvider)
  .get(validateGetProviderBooking, getProviderBooking);

module.exports = router;
