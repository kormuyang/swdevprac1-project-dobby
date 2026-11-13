const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/providers');
const { validateObjectId, validatePage } = require('../validators/providers');

const router = express.Router();
const parseJson = express.json({ limit: '16kb' });

function rejectBody(req, res, next) {
  if (req.body !== undefined || Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding')) {
    return res.status(400).json({ success: false, message: 'This request does not accept a body.' });
  }
  return next();
}

function pageOptions(req, res, next) {
  try { req.page = validatePage(req.query); return next(); }
  catch (error) { return res.status(error.status || 400).json({ success: false, message: error.message }); }
}

function pathId(req, res, next) {
  try { validateObjectId(req.params.applicationId, 'applicationId'); return next(); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
}

router.use(protect(), authorize('company'), parseJson);
router.get('/profile', rejectBody, controller.getOwnProvider);
router.get('/applications', pageOptions, rejectBody, controller.listOwnApplications);
router.post('/applications', controller.submitApplication);
router.get('/applications/:applicationId', pathId, rejectBody, controller.getOwnApplication);

router.use((error, req, res, next) => {
  if (error?.status >= 400 && error.status < 500) {
    const message = error.type === 'entity.too.large' ? 'Request body is too large.' : 'Request body must contain valid JSON.';
    return res.status(400).json({ success: false, message });
  }
  return res.status(500).json({ success: false, message: 'The request could not be completed.' });
});

module.exports = router;
