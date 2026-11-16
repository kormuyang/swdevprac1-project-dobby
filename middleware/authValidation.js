const { rejectBody, rejectQuery } = require('../validators/request');
const {
  validateProviderRegistration,
  validateLogin: validateLoginInput,
  validateRegistration,
} = require('../validators/auth');

function validateRegisterCustomer(req, res, next) {
  try {
    rejectQuery(req);
    const input = validateRegistration(req.body);
    req.validated = { body: input };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateRegisterProvider(req, res, next) {
  try {
    rejectQuery(req);
    const input = validateProviderRegistration(req.body);
    req.validated = { body: input };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateLogin(req, res, next) {
  try {
    rejectQuery(req);
    const input = validateLoginInput(req.body);
    req.validated = { body: input };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateLogout(req, res, next) {
  try {
    rejectQuery(req);
    rejectBody(req);
    req.validated = {};
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetMe(req, res, next) {
  try {
    rejectQuery(req);
    rejectBody(req);
    req.validated = {};
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateRegisterCustomer,
  validateRegisterProvider,
  validateLogin,
  validateLogout,
  validateGetMe,
};
