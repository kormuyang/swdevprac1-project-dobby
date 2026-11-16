const {
  validateListPublicProviders,
  validateGetPublicProvider,
  validateGetOwnProvider,
  validateListOwnApplications,
  validateGetOwnApplication,
  validateSubmitApplication,
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
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listPublicProviders,
  getPublicProvider,
  getOwnProvider,
  listOwnApplications,
  submitApplication,
  getOwnApplication,
  listAdminProviders,
  getAdminProvider,
  listAdminApplications,
  getAdminApplication,
  reviewApplication,
} = require('../controllers/providers');
const { suspendProvider, reactivateProvider } = require('../controllers/providerLifecycle');

const router = express.Router();

router.route('/providers').get(validateListPublicProviders, listPublicProviders);
router.route('/providers/:providerId').get(validateGetPublicProvider, getPublicProvider);

router
  .route('/provider/profile')
  .all(protect(), authorize('provider'))
  .get(validateGetOwnProvider, getOwnProvider);
router
  .route('/provider/applications')
  .all(protect(), authorize('provider'))
  .get(validateListOwnApplications, listOwnApplications)
  .post(validateSubmitApplication, submitApplication);
router
  .route('/provider/applications/:applicationId')
  .all(protect(), authorize('provider'))
  .get(validateGetOwnApplication, getOwnApplication);

router
  .route('/admin/providers')
  .all(protect(), authorize('admin'))
  .get(validateListAdminProviders, listAdminProviders);
router
  .route('/admin/providers/:providerId')
  .all(protect(), authorize('admin'))
  .get(validateGetAdminProvider, getAdminProvider);
router
  .route('/admin/applications')
  .all(protect(), authorize('admin'))
  .get(validateListAdminApplications, listAdminApplications);
router
  .route('/admin/applications/:applicationId')
  .all(protect(), authorize('admin'))
  .get(validateGetAdminApplication, getAdminApplication);
router
  .route('/admin/applications/:applicationId/review')
  .all(protect(), authorize('admin'))
  .post(validateReviewApplication, reviewApplication);
router
  .route('/admin/providers/:providerId/suspend')
  .all(protect(), authorize('admin'))
  .post(validateSuspendProvider, suspendProvider);
router
  .route('/admin/providers/:providerId/reactivate')
  .all(protect(), authorize('admin'))
  .post(validateReactivateProvider, reactivateProvider);

module.exports = router;
