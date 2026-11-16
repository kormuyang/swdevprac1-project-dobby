const Provider = require('../models/Provider');

async function requireApprovedProvider(actor, session = null) {
  let provider;
  if (actor?.role === 'provider' && actor.providerId) {
    provider = await Provider.findOne({
      _id: actor.providerId,
      representativeId: actor.userId,
      status: 'approved',
      approvedApplicationId: { $ne: null },
    }).session(session);
  }
  if (!provider) {
    const error = new Error('An approved provider account is required.');
    error.status = 403;
    throw error;
  }
  return provider;
}

module.exports = { requireApprovedProvider };
