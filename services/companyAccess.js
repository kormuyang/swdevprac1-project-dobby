const Provider = require('../models/Provider');

async function requireApprovedCompany(actor, session = null) {
  let provider;
  if (actor?.role === 'company' && actor.providerId) {
    provider = await Provider.findOne({
      _id: actor.providerId,
      representativeId: actor.userId,
      status: 'approved',
      approvedApplicationId: { $ne: null },
    }).session(session);
  }
  if (!provider) {
    const error = new Error('An approved company account is required.');
    error.status = 403;
    throw error;
  }
  return provider;
}

module.exports = { requireApprovedCompany };
