const { validateProfile } = require('./auth');

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateReview(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Request body must be an object.');
  }
  if (body.decision === 'approve' && Object.keys(body).length === 1) {
    return { decision: 'approve' };
  }
  if (body.decision === 'reject' && Object.keys(body).every((key) => ['decision', 'reason'].includes(key))) {
    if (typeof body.reason !== 'string') {
      throw badRequest('reason is required when rejecting an application.');
    }
    const reason = body.reason.trim();
    if (!reason || reason.length > 1000) {
      throw badRequest('reason must be between 1 and 1000 characters.');
    }
    return { decision: 'reject', reason };
  }
  throw badRequest('Review must be approve or reject with a reason.');
}

function validateObjectId(value, name) {
  if (typeof value !== 'string' || !/^[0-9a-fA-F]{24}$/.test(value)) {
    throw badRequest(`${name} must be a MongoDB ObjectId.`);
  }
  return value;
}

function validatePage(query, { statuses, allowProviderId = false } = {}) {
  const allowed = ['page', 'limit'];
  if (statuses) allowed.push('status');
  if (allowProviderId) allowed.push('providerId');
  const unknown = Object.keys(query).find((key) => !allowed.includes(key));
  if (unknown) throw badRequest(`Unknown query parameter: ${unknown}.`);
  function integer(name, fallback, max = Number.MAX_SAFE_INTEGER) {
    if (query[name] === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(query[name]) || Number(query[name]) > max) {
      throw badRequest(`${name} must be a positive integer no greater than ${max}.`);
    }
    return Number(query[name]);
  }
  const page = integer('page', 1);
  const limit = integer('limit', 25, 100);
  const result = { page, limit };
  if (query.status !== undefined) {
    if (!statuses?.includes(query.status)) throw badRequest('status is invalid.');
    result.status = query.status;
  }
  if (query.providerId !== undefined) result.providerId = validateObjectId(query.providerId, 'providerId');
  return result;
}

function validateApplication(body) {
  return validateProfile(body);
}

module.exports = { validateApplication, validateObjectId, validatePage, validateReview };
