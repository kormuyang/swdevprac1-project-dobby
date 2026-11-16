const express = require('express');
const {
  validateListPublicProviders,
  validateGetPublicProvider,
} = require('../middleware/providersValidation');
const { listPublicProviders, getPublicProvider } = require('../controllers/providers');

const router = express.Router();

router.route('/').get(validateListPublicProviders, listPublicProviders);

router.route('/:providerId').get(validateGetPublicProvider, getPublicProvider);

module.exports = router;
