const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { rejectBody, rejectQuery } = require('../middleware/validateRequest');
const controller = require('../controllers/providers');
const { validateObjectId, validatePage } = require('../validators/providers');

const router = express.Router();
const parseJson = express.json({ limit: '16kb' });


function pageOptions(req, res, next) {
  try {
    req.page = validatePage(req.query);
    return next();
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

function pathId(req, res, next) {
  try {
    validateObjectId(req.params.applicationId, 'applicationId');
    return next();
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

router.use(protect(), authorize('company'), parseJson);
router.get('/profile', rejectQuery, rejectBody, controller.getOwnProvider);
router.get('/applications', pageOptions, rejectBody, controller.listOwnApplications);
router.post('/applications', rejectQuery, controller.submitApplication);
router.get('/applications/:applicationId', rejectQuery, pathId, rejectBody, controller.getOwnApplication);

router.use((error, req, res, next) => {
  if (error?.status >= 400 && error.status < 500) {
    const message = error.type === 'entity.too.large' ? 'Request body is too large.' : 'Request body must contain valid JSON.';
    return res.status(400).json({ success: false, message });
  }
  return res.status(500).json({ success: false, message: 'The request could not be completed.' });
});

module.exports = router;
