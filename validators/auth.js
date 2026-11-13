const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
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

function stringField(value, field, { min, max, email = false } = {}) {
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string.`);
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw badRequest(`${field} must be between ${min} and ${max} characters.`);
  }
  if (email && (!EMAIL_PATTERN.test(normalized) || normalized.length > 254)) {
    throw badRequest(`${field} must be a valid email address.`);
  }
  return normalized;
}

function passwordField(value) {
  if (typeof value !== 'string') {
    throw badRequest('password must be a string.');
  }
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes < 8 || bytes > 72) {
    throw badRequest('password must be 8 to 72 UTF-8 bytes.');
  }
  return value;
}

function validateCredentials(body, allowedFields) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, allowedFields, 'request');
  return {
    name: body.name === undefined ? undefined : stringField(body.name, 'name', { min: 1, max: 120 }),
    telephone: body.telephone === undefined ? undefined : stringField(body.telephone, 'telephone', { min: 3, max: 30 }),
    email: stringField(body.email, 'email', { min: 1, max: 254, email: true }).toLowerCase(),
    password: passwordField(body.password),
  };
}

function validateRegistration(body) {
  const input = validateCredentials(body, ['name', 'telephone', 'email', 'password']);
  if (input.name === undefined || input.telephone === undefined) {
    throw badRequest('name and telephone are required.');
  }
  return input;
}

function validateLogin(body) {
  const input = validateCredentials(body, ['email', 'password']);
  return { email: input.email, password: input.password };
}

function validateProfile(value) {
  requireObject(value, 'profile');
  const fields = ['legalName', 'registeredAddress', 'telephone', 'contactEmail', 'documentUrl'];
  rejectUnknownFields(value, fields, 'profile');
  const profile = {
    legalName: stringField(value.legalName, 'profile.legalName', { min: 1, max: 200 }),
    registeredAddress: stringField(value.registeredAddress, 'profile.registeredAddress', { min: 1, max: 500 }),
    telephone: stringField(value.telephone, 'profile.telephone', { min: 3, max: 30 }),
    contactEmail: stringField(value.contactEmail, 'profile.contactEmail', { min: 1, max: 254, email: true }).toLowerCase(),
    documentUrl: stringField(value.documentUrl, 'profile.documentUrl', { min: 1, max: 2048 }),
  };
  let document;
  try {
    document = new URL(profile.documentUrl);
  } catch {
    throw badRequest('profile.documentUrl must be a valid HTTPS URL.');
  }
  if (document.protocol !== 'https:') {
    throw badRequest('profile.documentUrl must be a valid HTTPS URL.');
  }
  return profile;
}

function validateCompanyRegistration(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(body, [
    'name', 'telephone', 'email', 'password', 'businessRegistrationNumber', 'profile',
  ], 'request');
  const credentials = validateRegistration({
    name: body.name,
    telephone: body.telephone,
    email: body.email,
    password: body.password,
  });
  return {
    ...credentials,
    businessRegistrationNumber: stringField(body.businessRegistrationNumber, 'businessRegistrationNumber', { min: 1, max: 50 }),
    profile: validateProfile(body.profile),
  };
}

module.exports = { validateCompanyRegistration, validateLogin, validateProfile, validateRegistration };
