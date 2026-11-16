const express = require('express');
const { todayBangkok } = require('../utils/dates');
const { objectIdField } = require('../validators/fields');
const { requireApprovedCompany } = require('../services/companyAccess');

const parseJson = express.json({ limit: '16kb' });

function sendValidationError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({
    success: false,
    message: status < 500 ? error.message : 'The request could not be completed.',
  });
}

function validateBody(validator) {
  return function validateInput(req, res, next) {
    try {
      req.input = validator(req.body);
      return next();
    } catch (error) {
      return sendValidationError(res, error);
    }
  };
}

function validateQuery(validator) {
  return function validateFilters(req, res, next) {
    try {
      req.filters = validator(req.query, todayBangkok(new Date()), req.actor);
      return next();
    } catch (error) {
      return sendValidationError(res, error);
    }
  };
}

function validateId(name) {
  return function validateResourceId(req, res, next) {
    try {
      req.resourceId = objectIdField(req.params[name], name);
      return next();
    } catch (error) {
      return sendValidationError(res, error);
    }
  };
}

async function approvedCompany(req, res, next) {
  try {
    await requireApprovedCompany(req.actor);
    return next();
  } catch (error) {
    return sendValidationError(res, error);
  }
}

function jsonErrors(error, req, res, next) {
  if (error?.type === 'entity.too.large') {
    return res.status(400).json({ success: false, message: 'Request body is too large.' });
  }
  if (error?.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ success: false, message: 'Request body must contain valid JSON.' });
  }
  return res.status(500).json({ success: false, message: 'The request could not be completed.' });
}

module.exports = {
  parseJson,
  validateBody,
  validateQuery,
  validateId,
  approvedCompany,
  jsonErrors,
};
