const AppError = require('../utils/AppError');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

function badRequest(message) {
  return new AppError(400, message);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest(`${label} must be an object.`);
  }
}

function rejectUnknownFields(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw badRequest(`Unknown ${label} field: ${unknown[0]}.`);
  }
}

function stringField(value, field, { min, max, email = false, uppercase = false } = {}) {
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string.`);
  }
  let normalized = value.trim();
  if (uppercase) {
    normalized = normalized.toUpperCase();
  }
  if (normalized.length < min || normalized.length > max) {
    throw badRequest(`${field} must be between ${min} and ${max} characters.`);
  }
  if (email && (!EMAIL_PATTERN.test(normalized) || normalized.length > 254)) {
    throw badRequest(`${field} must be a valid email address.`);
  }
  return normalized;
}

function integerField(value, field, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw badRequest(`${field} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function enumField(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value;
}

function objectIdField(value, field) {
  if (typeof value !== 'string' || !/^[0-9a-f]{24}$/i.test(value)) {
    throw badRequest(`${field} must be a valid ID.`);
  }
  return value.toLowerCase();
}

module.exports = {
  requireObject,
  rejectUnknownFields,
  stringField,
  integerField,
  enumField,
  objectIdField,
};
