const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  validateListAdminProviders,
  validateGetAdminProvider,
  validateListAdminApplications,
  validateGetAdminApplication,
  validateReviewApplication,
} = require('../middleware/providersValidation');
const {
  validateSuspendProvider,
  validateReactivateProvider,
} = require('../middleware/providerLifecycleValidation');
const {
  listAdminProviders,
  getAdminProvider,
  listAdminApplications,
  getAdminApplication,
  reviewApplication,
} = require('../controllers/providers');
const { suspendProvider, reactivateProvider } = require('../controllers/providerLifecycle');

const router = express.Router();

router
  .route('/providers')
  .all(protect(), authorize('admin'))
  .get(validateListAdminProviders, listAdminProviders);

router
  .route('/providers/:providerId')
  .all(protect(), authorize('admin'))
  .get(validateGetAdminProvider, getAdminProvider);

router
  .route('/applications')
  .all(protect(), authorize('admin'))
  .get(validateListAdminApplications, listAdminApplications);

router
  .route('/applications/:applicationId')
  .all(protect(), authorize('admin'))
  .get(validateGetAdminApplication, getAdminApplication);

router
  .route('/applications/:applicationId/review')
  .all(protect(), authorize('admin'))
  .post(validateReviewApplication, reviewApplication);

router
  .route('/providers/:providerId/suspend')
  .all(protect(), authorize('admin'))
  .post(validateSuspendProvider, suspendProvider);

router
  .route('/providers/:providerId/reactivate')
  .all(protect(), authorize('admin'))
  .post(validateReactivateProvider, reactivateProvider);

module.exports = router;
