const AppError = require('../utils/AppError');
function validateRequest(req, field) {
  if (!req.actor || req.actor.role !== 'admin') {
    throw new AppError(403, 'Administrator access is required.');
  }
  if (!/^[0-9a-f]{24}$/i.test(req.params.providerId)) {
    throw new AppError(400, 'providerId must be a valid ID.');
  }
  const body = req.body;
  if (
    Object.keys(req.query).length > 0 ||
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== field) ||
    typeof body[field] !== 'string' ||
    body[field].trim().length < 1 ||
    body[field].trim().length > 1000
  ) {
    throw new AppError(400, `Provide only ${field}, between 1 and 1000 characters.`);
  }
  return body[field].trim();
}

function validateSuspendProvider(req, res, next) {
  try {
    const reason = validateRequest(req, 'reason');
    req.validated = { body: { reason }, params: { providerId: req.params.providerId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateReactivateProvider(req, res, next) {
  try {
    const resolutionNote = validateRequest(req, 'resolutionNote');
    req.validated = { body: { resolutionNote }, params: { providerId: req.params.providerId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { validateSuspendProvider, validateReactivateProvider };
