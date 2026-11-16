const { requireObject, rejectUnknownFields, stringField } = require('./fields');

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
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
    name:
      body.name === undefined ? undefined : stringField(body.name, 'name', { min: 1, max: 120 }),
    telephone:
      body.telephone === undefined
        ? undefined
        : stringField(body.telephone, 'telephone', { min: 3, max: 30 }),
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
    registeredAddress: stringField(value.registeredAddress, 'profile.registeredAddress', {
      min: 1,
      max: 500,
    }),
    telephone: stringField(value.telephone, 'profile.telephone', { min: 3, max: 30 }),
    contactEmail: stringField(value.contactEmail, 'profile.contactEmail', {
      min: 1,
      max: 254,
      email: true,
    }).toLowerCase(),
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

function validateProviderRegistration(body) {
  requireObject(body, 'Request body');
  rejectUnknownFields(
    body,
    ['name', 'telephone', 'email', 'password', 'businessRegistrationNumber', 'profile'],
    'request',
  );
  const credentials = validateRegistration({
    name: body.name,
    telephone: body.telephone,
    email: body.email,
    password: body.password,
  });
  return {
    ...credentials,
    businessRegistrationNumber: stringField(
      body.businessRegistrationNumber,
      'businessRegistrationNumber',
      { min: 1, max: 50 },
    ),
    profile: validateProfile(body.profile),
  };
}

module.exports = {
  validateProviderRegistration,
  validateLogin,
  validateProfile,
  validateRegistration,
};
