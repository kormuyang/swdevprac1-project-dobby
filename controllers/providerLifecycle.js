const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const bookingCancellation = require('../services/bookingCancellation');
const { serializeProvider } = require('../serializers/providers');

async function suspendProvider(req, res, next) {
  let session;
  try {
    const { reason } = req.validated.body;
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      const provider = await Provider.findByIdAndUpdate(
        req.validated.params.providerId,
        { $inc: { revision: 1 } },
        { returnDocument: 'after', session },
      );
      if (!provider) {
        throw new AppError(404, 'Provider was not found.');
      }
      if (provider.status !== 'approved' || !provider.approvedApplicationId) {
        throw new AppError(409, 'Only an approved provider can be suspended.');
      }
      const application = await ProviderApplication.findById(
        provider.approvedApplicationId,
      ).session(session);
      if (!application || application.status !== 'approved') {
        throw new AppError(409, 'An approved provider profile is required.');
      }
      const now = new Date();
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      provider.status = 'suspended';
      provider.suspensionReason = reason;
      provider.suspendedAt = now;
      provider.suspendedBy = req.actor.userId;
      await provider.save({ session });
      const cancellation = await bookingCancellation.cancelNonCompletedForProvider({
        providerId: provider.id,
        actorId: req.actor.userId,
        today,
        now,
        session,
      });
      result = { provider: serializeProvider(provider, application), ...cancellation };
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function reactivateProvider(req, res, next) {
  let session;
  try {
    const { resolutionNote } = req.validated.body;
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      const provider = await Provider.findByIdAndUpdate(
        req.validated.params.providerId,
        { $inc: { revision: 1 } },
        { returnDocument: 'after', session },
      );
      if (!provider) {
        throw new AppError(404, 'Provider was not found.');
      }
      const application = provider.approvedApplicationId
        ? await ProviderApplication.findById(provider.approvedApplicationId).session(session)
        : null;
      if (provider.status !== 'suspended' || !application || application.status !== 'approved') {
        throw new AppError(
          409,
          'Reactivation requires a suspended provider with an approved profile.',
        );
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
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { reactivateProvider, suspendProvider };
