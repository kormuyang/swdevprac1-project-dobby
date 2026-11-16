const AppError = require('../utils/AppError');
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
    throw new AppError(403, 'An approved provider account is required.');
  }
  return provider;
}

module.exports = { requireApprovedProvider };
