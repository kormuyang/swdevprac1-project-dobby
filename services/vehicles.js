const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { todayBangkok } = require('../utils/dates');
const { requireApprovedCompany } = require('./companyAccess');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function pageResult(data, total, filters) {
  return { data, count: data.length, pagination: {
    page: filters.page, limit: filters.limit, total, pages: Math.ceil(total / filters.limit),
  } };
}

async function aggregatePage(Model, pipeline, filters, sort) {
  const [result] = await Model.aggregate([...pipeline, { $facet: {
    data: [{ $sort: sort }, { $skip: (filters.page - 1) * filters.limit }, { $limit: filters.limit }],
    totals: [{ $count: 'count' }],
  } }]);
  return pageResult(result.data, result.totals[0]?.count || 0, filters);
}

function approvedProfileStages() {
  return [
    { $match: { status: 'approved', approvedApplicationId: { $ne: null } } },
    { $lookup: {
      from: 'providerapplications',
      let: { applicationId: '$approvedApplicationId', providerId: '$_id' },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$_id', '$$applicationId'] }, { $eq: ['$providerId', '$$providerId'] },
          { $eq: ['$status', 'approved'] },
        ] } } },
        { $project: { 'profile.legalName': 1, 'profile.registeredAddress': 1, 'profile.telephone': 1 } },
      ],
      as: 'approvedApplication',
    } },
    { $unwind: '$approvedApplication' },
    { $project: { _id: 1, approvedApplication: 1, createdAt: 1 } },
  ];
}

async function listPublicProviders(filters) {
  return aggregatePage(Provider, approvedProfileStages(), filters, { createdAt: -1, _id: -1 });
}

async function getPublicProvider(id) {
  const [provider] = await Provider.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } }, ...approvedProfileStages(),
  ]);
  if (!provider) {
    fail(404, 'The provider was not found.');
  }
  return provider;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicVehicleStages(filters, today) {
  const match = { isActive: true, $or: [{ availableUntil: null }, { availableUntil: { $gte: today } }] };
  if (filters.providerId) {
    match.providerId = new mongoose.Types.ObjectId(filters.providerId);
  }
  if (filters.brand) {
    match.brand = { $regex: `^${escapeRegex(filters.brand)}$`, $options: 'i' };
  }
  if (filters.model) {
    match.model = { $regex: escapeRegex(filters.model), $options: 'i' };
  }
  for (const field of ['transmissionType', 'fuelType']) {
    if (filters[field]) {
      match[field] = filters[field];
    }
  }
  if (filters.minSeats) {
    match.seatingCapacity = { $gte: filters.minSeats };
  }
  if (filters.minRatePerDaySatang || filters.maxRatePerDaySatang) {
    match.ratePerDaySatang = {};
    if (filters.minRatePerDaySatang) {
      match.ratePerDaySatang.$gte = filters.minRatePerDaySatang;
    }
    if (filters.maxRatePerDaySatang) {
      match.ratePerDaySatang.$lte = filters.maxRatePerDaySatang;
    }
  }
  if (filters.startDate) {
    match.availableFrom = { $lte: filters.startDate };
    match.$or = [{ availableUntil: null }, { availableUntil: { $gte: filters.dueDate } }];
  }
  const pipeline = [
    { $match: match },
    { $lookup: { from: 'providers', localField: 'providerId', foreignField: '_id',
      pipeline: approvedProfileStages(), as: 'eligibleProvider' } },
    { $match: { 'eligibleProvider.0': { $exists: true } } },
    { $unset: 'eligibleProvider' },
  ];
  if (filters.startDate) {
    pipeline.push(
      { $lookup: { from: 'bookings', let: { vehicleId: '$_id', providerId: '$providerId' },
        pipeline: [
          { $match: { state: 'confirmed', startDate: { $lte: filters.dueDate }, dueDate: { $gte: filters.startDate },
            $expr: { $and: [{ $eq: ['$vehicleId', '$$vehicleId'] }, { $eq: ['$providerId', '$$providerId'] }] } } },
          { $limit: 1 }, { $project: { _id: 1 } },
        ], as: 'occupied' } },
      { $match: { 'occupied.0': { $exists: false } } },
      { $unset: 'occupied' },
    );
  }
  return pipeline;
}

async function listPublicVehicles(filters, ctx = {}) {
  const today = todayBangkok(ctx.clock ? ctx.clock.now() : new Date());
  const field = filters.sort.replace(/^-/, '');
  const direction = filters.sort.startsWith('-') ? -1 : 1;
  return aggregatePage(Vehicle, publicVehicleStages(filters, today), filters, { [field]: direction, _id: direction });
}

async function getPublicVehicle(id, ctx = {}) {
  const today = todayBangkok(ctx.clock ? ctx.clock.now() : new Date());
  const [vehicle] = await Vehicle.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } }, ...publicVehicleStages({}, today),
  ]);
  if (!vehicle) {
    fail(404, 'The vehicle was not found.');
  }
  return vehicle;
}

async function listOwnVehicles(filters, ctx) {
  await requireApprovedCompany(ctx.actor);
  const filter = { providerId: ctx.actor.providerId };
  if (filters.isActive !== undefined) {
    filter.isActive = filters.isActive;
  }
  const total = await Vehicle.countDocuments(filter);
  const data = await Vehicle.find(filter).sort({ createdAt: -1, _id: -1 })
    .skip((filters.page - 1) * filters.limit).limit(filters.limit);
  return pageResult(data, total, filters);
}

async function getOwnVehicle(id, ctx) {
  await requireApprovedCompany(ctx.actor);
  const vehicle = await Vehicle.findOne({ _id: id, providerId: ctx.actor.providerId });
  if (!vehicle) {
    fail(404, 'The vehicle was not found.');
  }
  return vehicle;
}

async function writeVehicle(id, input, ctx, operation) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      if (ctx.actor?.role !== 'company' || !ctx.actor.providerId) {
        fail(403, 'An approved company account is required.');
      }
      // A03 takes this same provider guard before suspension and cancellation.
      await Provider.updateOne({ _id: ctx.actor.providerId, representativeId: ctx.actor.userId },
        { $inc: { revision: 1 } }, { session });
      await requireApprovedCompany(ctx.actor, session);
      const today = todayBangkok(ctx.clock ? ctx.clock.now() : new Date());
      let vehicle;
      if (id) {
        vehicle = await Vehicle.findOneAndUpdate({ _id: id, providerId: ctx.actor.providerId },
          { $inc: { revision: 1 } }, { session, returnDocument: 'after' });
        if (!vehicle) {
          fail(404, 'The vehicle was not found.');
        }
      } else {
        vehicle = new Vehicle({ ...input, providerId: ctx.actor.providerId });
      }
      if (operation === 'details') {
        if (input.pickupBranch !== undefined) {
          vehicle.pickupBranch = input.pickupBranch;
        }
        if (input.ratePerDaySatang !== undefined) {
          vehicle.ratePerDaySatang = input.ratePerDaySatang;
        }
      }
      if (operation === 'availability') {
        const excludedBooking = await Booking.exists({ vehicleId: vehicle._id, providerId: vehicle.providerId,
          state: 'confirmed', dueDate: { $gte: today }, $or: [
            { startDate: { $lt: input.availableFrom } },
            ...(input.availableUntil === null ? [] : [{ dueDate: { $gt: input.availableUntil } }]),
          ] }).session(session);
        if (excludedBooking) {
          fail(409, 'The offering period must retain upcoming and ongoing bookings.');
        }
        vehicle.availableFrom = input.availableFrom;
        vehicle.availableUntil = input.availableUntil;
      }
      if (operation === 'activation') {
        vehicle.isActive = input.isActive;
      }
      await vehicle.save({ session });
      result = vehicle;
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, timeoutMS: 2500 });
    return result;
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.vin) {
      fail(409, 'A vehicle with this VIN already exists.');
    }
    if (!error.hasErrorLabel?.('UnknownTransactionCommitResult') && error.hasErrorLabel?.('TransientTransactionError')) {
      fail(409, 'The vehicle changed during this request. Try again.');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

function createVehicle(input, ctx) {
  return writeVehicle(null, input, ctx, 'create');
}
function updateVehicle(id, input, ctx) {
  return writeVehicle(id, input, ctx, 'details');
}
function updateAvailability(id, input, ctx) {
  return writeVehicle(id, input, ctx, 'availability');
}
function setVehicleActivation(id, input, ctx) {
  return writeVehicle(id, input, ctx, 'activation');
}

module.exports = { listPublicProviders, getPublicProvider, listPublicVehicles, getPublicVehicle,
  listOwnVehicles, getOwnVehicle, createVehicle, updateVehicle, updateAvailability, setVehicleActivation };
