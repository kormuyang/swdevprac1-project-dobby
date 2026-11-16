const { objectIdField } = require('../validators/fields');
const { rejectBody, rejectQuery } = require('../validators/request');
const {
  validateApplication,
  validatePublicProviderFilters,
  validatePage,
  validateReview,
} = require('../validators/providers');

function validateListPublicProviders(req, res, next) {
  try {
    rejectBody(req);
    const filters = validatePublicProviderFilters(req.query);
    req.validated = { query: filters };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetPublicProvider(req, res, next) {
  try {
    rejectBody(req);
    rejectQuery(req);
    const providerId = objectIdField(req.params.providerId, 'providerId');
    req.validated = { params: { providerId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetOwnProvider(req, res, next) {
  try {
    rejectQuery(req);
    rejectBody(req);
    req.validated = {};
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateListOwnApplications(req, res, next) {
  try {
    const page = validatePage(req.query);
    rejectBody(req);
    req.validated = { query: page };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetOwnApplication(req, res, next) {
  try {
    rejectQuery(req);
    const applicationId = objectIdField(req.params.applicationId, 'applicationId');
    rejectBody(req);
    req.validated = { params: { applicationId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateSubmitApplication(req, res, next) {
  try {
    rejectQuery(req);
    const profile = validateApplication(req.body);
    req.validated = { body: profile };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateListAdminProviders(req, res, next) {
  try {
    const page = validatePage(req.query, {
      statuses: ['pending', 'rejected', 'approved', 'suspended'],
    });
    rejectBody(req);
    req.validated = { query: page };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetAdminProvider(req, res, next) {
  try {
    rejectQuery(req);
    const providerId = objectIdField(req.params.providerId, 'providerId');
    rejectBody(req);
    req.validated = { params: { providerId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateListAdminApplications(req, res, next) {
  try {
    const page = validatePage(req.query, {
      statuses: ['pending', 'approved', 'rejected'],
      allowProviderId: true,
    });
    rejectBody(req);
    req.validated = { query: page };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateGetAdminApplication(req, res, next) {
  try {
    rejectQuery(req);
    const applicationId = objectIdField(req.params.applicationId, 'applicationId');
    rejectBody(req);
    req.validated = { params: { applicationId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateReviewApplication(req, res, next) {
  try {
    rejectQuery(req);
    const applicationId = objectIdField(req.params.applicationId, 'applicationId');
    const input = validateReview(req.body);
    req.validated = { body: input, params: { applicationId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateListPublicProviders,
  validateGetPublicProvider,
  validateGetOwnProvider,
  validateListOwnApplications,
  validateGetOwnApplication,
  validateSubmitApplication,
  validateListAdminProviders,
  validateGetAdminProvider,
  validateListAdminApplications,
  validateGetAdminApplication,
  validateReviewApplication,
};
