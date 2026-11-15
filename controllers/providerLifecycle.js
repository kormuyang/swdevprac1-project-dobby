const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const bookingCancellation = require('../services/bookingCancellation');
const { serializeProvider } = require('../serializers/providers');

function validateRequest(req, field) {
  if (!req.actor || req.actor.role !== 'admin') {
    const error = new Error('Administrator access is required.');
    error.status = 403;
    throw error;
  }
  if (!/^[0-9a-f]{24}$/i.test(req.params.providerId)) {
    const error = new Error('providerId must be a valid ID.');
    error.status = 400;
    throw error;
  }
  const body = req.body;
  if (Object.keys(req.query).length > 0 || !body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some((key) => key !== field)
    || typeof body[field] !== 'string' || body[field].trim().length < 1 || body[field].trim().length > 1000) {
    const error = new Error(`Provide only ${field}, between 1 and 1000 characters.`);
    error.status = 400;
    throw error;
  }
  return body[field].trim();
}

function sendError(res, error) {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'The request could not be completed.' : error.message,
  });
}

async function suspendProvider(req, res) {
  let session;
  try {
    const reason = validateRequest(req, 'reason');
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      const provider = await Provider.findByIdAndUpdate(
        req.params.providerId, { $inc: { revision: 1 } }, { returnDocument: 'after', session },
      );
      if (!provider) {
        const error = new Error('Company was not found.');
        error.status = 404;
        throw error;
      }
      if (provider.status !== 'approved' || !provider.approvedApplicationId) {
        const error = new Error('Only an approved company can be suspended.');
        error.status = 409;
        throw error;
      }
      const application = await ProviderApplication.findById(provider.approvedApplicationId).session(session);
      if (!application || application.status !== 'approved') {
        const error = new Error('An approved company profile is required.');
        error.status = 409;
        throw error;
      }
      const now = new Date();
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      provider.status = 'suspended';
      provider.suspensionReason = reason;
      provider.suspendedAt = now;
      provider.suspendedBy = req.actor.userId;
      await provider.save({ session });
      const cancellation = await bookingCancellation.cancelNonCompletedForProvider({
        providerId: provider.id, actorId: req.actor.userId, today, now, session,
      });
      result = { provider: serializeProvider(provider, application), ...cancellation };
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return sendError(res, error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function reactivateProvider(req, res) {
  let session;
  try {
    const resolutionNote = validateRequest(req, 'resolutionNote');
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      const provider = await Provider.findByIdAndUpdate(
        req.params.providerId, { $inc: { revision: 1 } }, { returnDocument: 'after', session },
      );
      if (!provider) {
        const error = new Error('Company was not found.');
        error.status = 404;
        throw error;
      }
      const application = provider.approvedApplicationId
        ? await ProviderApplication.findById(provider.approvedApplicationId).session(session) : null;
      if (provider.status !== 'suspended' || !application || application.status !== 'approved') {
        const error = new Error('Reactivation requires a suspended company with an approved profile.');
        error.status = 409;
        throw error;
      }
      provider.status = 'approved';
      provider.reactivationNote = resolutionNote;
      provider.reactivatedAt = new Date();
      provider.reactivatedBy = req.actor.userId;
      await provider.save({ session });
      result = serializeProvider(provider, application);
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return sendError(res, error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { reactivateProvider, suspendProvider };
