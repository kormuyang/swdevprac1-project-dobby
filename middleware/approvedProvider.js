const { requireApprovedProvider } = require('../services/providerAccess');

async function approvedProvider(req, res, next) {
  try {
    await requireApprovedProvider(req.actor);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { approvedProvider };
