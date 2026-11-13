const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { rejectQuery } = require('../middleware/rejectQuery');
const controller = require('../controllers/providers');
const { validateObjectId, validatePage, validateReview } = require('../validators/providers');

const router = express.Router();
const parseJson = express.json({ limit: '16kb' });

function rejectBody(req, res, next) {
  if (req.body !== undefined || Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding')) {
    return res.status(400).json({ success: false, message: 'This request does not accept a body.' });
  }
  return next();
}

function pageOptions(req, res, next) {
  try {
    req.page = validatePage(req.query, req.path === '/applications'
      ? { statuses: ['pending', 'approved', 'rejected'], allowProviderId: true }
      : { statuses: ['pending', 'rejected', 'approved', 'suspended'] });
    return next();
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

function pathId(req, res, next) {
  const name = req.params.providerId ? 'providerId' : 'applicationId';
  try {
    validateObjectId(req.params[name], name);
    return next();
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

function reviewInput(req, res, next) {
  try {
    req.review = validateReview(req.body);
    return next();
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

router.use(protect(), authorize('admin'), parseJson);
router.get('/providers', pageOptions, rejectBody, controller.listAdminProviders);
router.get('/providers/:providerId', rejectQuery(), pathId, rejectBody, controller.getAdminProvider);
router.get('/applications', pageOptions, rejectBody, controller.listAdminApplications);
router.get('/applications/:applicationId', rejectQuery(), pathId, rejectBody, controller.getAdminApplication);
router.post('/applications/:applicationId/review', rejectQuery(), pathId, reviewInput, controller.reviewApplication);

router.use((error, req, res, next) => {
  if (error?.status >= 400 && error.status < 500) {
    const message = error.type === 'entity.too.large' ? 'Request body is too large.' : 'Request body must contain valid JSON.';
    return res.status(400).json({ success: false, message });
  }
  return res.status(500).json({ success: false, message: 'The request could not be completed.' });
});

module.exports = router;
