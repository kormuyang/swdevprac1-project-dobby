const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const ProviderApplication = require('../models/ProviderApplication');
const {
  serializeApplication,
  serializePage,
  serializeProvider,
} = require('../serializers/providers');

function notFound() {
  return new AppError(404, 'The requested resource was not found.');
}

function conflict(message = 'The resource is not in the required state.') {
  return new AppError(409, message);
}

function mapDuplicate(error) {
  if (
    error?.code === 11000 &&
    Object.keys(error.keyPattern || {}).length === 1 &&
    error.keyPattern.providerId
  ) {
    return conflict('This provider already has a pending application.');
  }
  return error;
}

async function providerForResponse(provider) {
  const approved = provider.approvedApplicationId
    ? await ProviderApplication.findOne({
        _id: provider.approvedApplicationId,
        providerId: provider._id,
      })
    : null;
  return serializeProvider(provider, approved);
}

async function getOwnProvider(req, res, next) {
  try {
    const provider = await Provider.findOne({
      _id: req.actor.providerId,
      representativeId: req.actor.userId,
    });
    if (!provider) {
      throw notFound();
    }
    return res.status(200).json({ success: true, data: await providerForResponse(provider) });
  } catch (error) {
    return next(error);
  }
}

async function listOwnApplications(req, res, next) {
  try {
    const page = req.validated.query;
    const filter = { providerId: req.actor.providerId };
    const [applications, total] = await Promise.all([
      ProviderApplication.find(filter)
        .sort({ version: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit),
      ProviderApplication.countDocuments(filter),
    ]);
    return res
      .status(200)
      .json(serializePage(applications.map(serializeApplication), total, page.page, page.limit));
  } catch (error) {
    return next(error);
  }
}

async function getOwnApplication(req, res, next) {
  try {
    const applicationId = req.validated.params.applicationId;
    const application = await ProviderApplication.findOne({
      _id: applicationId,
      providerId: req.actor.providerId,
    });
    if (!application) {
      throw notFound();
    }
    return res.status(200).json({ success: true, data: serializeApplication(application) });
  } catch (error) {
    return next(error);
  }
}

async function submitApplication(req, res, next) {
  let session;
  try {
    const profile = req.validated.body;
    session = await mongoose.startSession();
    let submitted;
    await session.withTransaction(async () => {
      const provider = await Provider.findOneAndUpdate(
        {
          _id: req.actor.providerId,
          representativeId: req.actor.userId,
          status: { $ne: 'suspended' },
        },
        { $inc: { revision: 1 } },
        { returnDocument: 'after', session },
      );
      if (!provider) {
        const exists = await Provider.exists({
          _id: req.actor.providerId,
          representativeId: req.actor.userId,
        }).session(session);
        if (!exists) {
          throw notFound();
        }
        throw new AppError(403, 'This provider account is suspended.');
      }
      const pending = await ProviderApplication.exists({
        providerId: provider._id,
        status: 'pending',
      }).session(session);
      if (pending) {
        throw conflict('This provider already has a pending application.');
      }
      const applicationId = new mongoose.Types.ObjectId();
      const application = new ProviderApplication({
        _id: applicationId,
        providerId: provider._id,
        version: provider.applicationSequence + 1,
        businessRegistrationNumber: provider.businessRegistrationNumber,
        profile,
        status: 'pending',
        submittedAt: new Date(),
      });
      await application.save({ session });
      const changes = {
        $set: { latestApplicationId: application._id },
        $inc: { applicationSequence: 1 },
      };
      if (!provider.approvedApplicationId && provider.status !== 'suspended') {
        changes.$set.status = 'pending';
      }
      await Provider.updateOne({ _id: provider._id, revision: provider.revision }, changes, {
        session,
      });
      submitted = application;
    });
    return res.status(201).json({ success: true, data: serializeApplication(submitted) });
  } catch (error) {
    return next(mapDuplicate(error));
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function listAdminProviders(req, res, next) {
  try {
    const page = req.validated.query;
    const filter = page.status ? { status: { $eq: String(page.status) } } : {};
    const [providers, total] = await Promise.all([
      Provider.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit),
      Provider.countDocuments(filter),
    ]);
    const data = [];
    for (const provider of providers) {
      data.push(await providerForResponse(provider));
    }
    return res.status(200).json(serializePage(data, total, page.page, page.limit));
  } catch (error) {
    return next(error);
  }
}

async function getAdminProvider(req, res, next) {
  try {
    const providerId = req.validated.params.providerId;
    const provider = await Provider.findById(providerId);
    if (!provider) {
      throw notFound();
    }
    return res.status(200).json({ success: true, data: await providerForResponse(provider) });
  } catch (error) {
    return next(error);
  }
}

async function listAdminApplications(req, res, next) {
  try {
    const page = req.validated.query;
    const filter = {};
    if (page.status) {
      filter.status = { $eq: String(page.status) };
    }
    if (page.providerId) {
      filter.providerId = new mongoose.Types.ObjectId(page.providerId);
    }
    const [applications, total] = await Promise.all([
      ProviderApplication.find(filter)
        .sort({ submittedAt: 1, _id: 1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit),
      ProviderApplication.countDocuments(filter),
    ]);
    return res
      .status(200)
      .json(serializePage(applications.map(serializeApplication), total, page.page, page.limit));
  } catch (error) {
    return next(error);
  }
}

async function getAdminApplication(req, res, next) {
  try {
    const applicationId = req.validated.params.applicationId;
    const application = await ProviderApplication.findById(applicationId);
    if (!application) {
      throw notFound();
    }
    return res.status(200).json({ success: true, data: serializeApplication(application) });
  } catch (error) {
    return next(error);
  }
}

async function reviewApplication(req, res, next) {
  let session;
  try {
    const applicationId = req.validated.params.applicationId;
    const input = req.validated.body;
    const preliminary = await ProviderApplication.findById(applicationId).select('providerId');
    if (!preliminary) {
      throw notFound();
    }
    session = await mongoose.startSession();
    let reviewed;
    await session.withTransaction(async () => {
      const provider = await Provider.findOneAndUpdate(
        { _id: preliminary.providerId },
        { $inc: { revision: 1 } },
        { returnDocument: 'after', session },
      );
      if (!provider) {
        throw notFound();
      }
      const now = new Date();
      const updated = await ProviderApplication.findOneAndUpdate(
        { _id: applicationId, providerId: provider._id, status: 'pending' },
        {
          $set: {
            status: input.decision === 'approve' ? 'approved' : 'rejected',
            rejectionReason: input.decision === 'reject' ? input.reason : null,
            reviewedBy: req.actor.userId,
            reviewedAt: now,
          },
        },
        { returnDocument: 'after', runValidators: true, session },
      );
      if (!updated) {
        throw conflict('The application has already been reviewed.');
      }
      if (input.decision === 'approve') {
        const changes = { approvedApplicationId: updated._id };
        if (provider.status !== 'suspended') {
          changes.status = 'approved';
        }
        await Provider.updateOne(
          { _id: provider._id, revision: provider.revision },
          { $set: changes },
          { session },
        );
      } else if (!provider.approvedApplicationId && provider.status !== 'suspended') {
        await Provider.updateOne(
          { _id: provider._id, revision: provider.revision },
          { $set: { status: 'rejected' } },
          { session },
        );
      }
      reviewed = updated;
    });
    return res.status(200).json({ success: true, data: serializeApplication(reviewed) });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = {
  getAdminApplication,
  getAdminProvider,
  getOwnApplication,
  getOwnProvider,
  listAdminApplications,
  listAdminProviders,
  listOwnApplications,
  reviewApplication,
  submitApplication,
};
