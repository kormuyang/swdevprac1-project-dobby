const { objectIdField } = require('../validators/fields');
const { rejectQuery } = require('../validators/request');
const { validateLifecycleInput } = require('../validators/providers');

function validateSuspendProvider(req, res, next) {
  try {
    const providerId = objectIdField(req.params.providerId, 'providerId');
    rejectQuery(req);
    const body = validateLifecycleInput(req.body, 'reason');
    req.validated = { body, params: { providerId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateReactivateProvider(req, res, next) {
  try {
    const providerId = objectIdField(req.params.providerId, 'providerId');
    rejectQuery(req);
    const body = validateLifecycleInput(req.body, 'resolutionNote');
    req.validated = { body, params: { providerId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { validateSuspendProvider, validateReactivateProvider };
