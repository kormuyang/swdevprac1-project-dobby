const AppError = require('../utils/AppError');
const mongoose = require('mongoose');
const Provider = require('../models/Provider');

function approvedProfileStages() {
  return [
    { $match: { status: 'approved', approvedApplicationId: { $ne: null } } },
    {
      $lookup: {
        from: 'providerapplications',
        let: { applicationId: '$approvedApplicationId', providerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$applicationId'] },
                  { $eq: ['$providerId', '$$providerId'] },
                  { $eq: ['$status', 'approved'] },
                ],
              },
            },
          },
          {
            $project: {
              'profile.legalName': 1,
              'profile.registeredAddress': 1,
              'profile.telephone': 1,
            },
          },
        ],
        as: 'approvedApplication',
      },
    },
    { $unwind: '$approvedApplication' },
    { $project: { _id: 1, approvedApplication: 1, createdAt: 1 } },
  ];
}

async function listPublicProviders(filters) {
  const [result] = await Provider.aggregate([
    ...approvedProfileStages(),
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (filters.page - 1) * filters.limit },
          { $limit: filters.limit },
        ],
        totals: [{ $count: 'count' }],
      },
    },
  ]);
  const total = result.totals[0]?.count || 0;
  return {
    data: result.data,
    count: result.data.length,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  };
}

async function getPublicProvider(id) {
  const [provider] = await Provider.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    ...approvedProfileStages(),
  ]);
  if (!provider) {
    throw new AppError(404, 'The provider was not found.');
  }
  return provider;
}

module.exports = {
  approvedProfileStages,
  listPublicProviders,
  getPublicProvider,
};
