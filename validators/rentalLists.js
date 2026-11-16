const AppError = require('../utils/AppError');
const { validatePage } = require('./providers');
const { requireObject, rejectUnknownFields, integerField } = require('./fields');

function listPage(query, allowed = []) {
  requireObject(query, 'Query');
  rejectUnknownFields(query, ['page', 'limit', ...allowed], 'query');
  return validatePage({ page: query.page, limit: query.limit });
}

function queryInteger(value, name, min, max) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new AppError(400, `${name} must be a positive integer.`);
  }
  return integerField(Number(value), name, min, max);
}

module.exports = { listPage, queryInteger };
