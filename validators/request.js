const AppError = require('../utils/AppError');
function badRequest(message) {
  throw new AppError(400, message);
}

function rejectQuery(req) {
  if (Object.keys(req.query).length > 0) {
    badRequest('Query parameters are not allowed.');
  }
}

function rejectBody(req) {
  if (
    req.body !== undefined ||
    Number(req.get('content-length') || 0) > 0 ||
    req.get('transfer-encoding')
  ) {
    badRequest('This request does not accept a body.');
  }
}

module.exports = { rejectBody, rejectQuery };
