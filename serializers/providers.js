function id(value) {
  return value ? String(value._id || value) : null;
}

function serializeApplication(application) {
  return {
    id: id(application._id),
    providerId: id(application.providerId),
    version: application.version,
    businessRegistrationNumber: application.businessRegistrationNumber,
    profile: {
      legalName: application.profile.legalName,
      registeredAddress: application.profile.registeredAddress,
      telephone: application.profile.telephone,
      contactEmail: application.profile.contactEmail,
      documentUrl: application.profile.documentUrl,
    },
    status: application.status,
    rejectionReason: application.rejectionReason || null,
    reviewedBy: id(application.reviewedBy),
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt || null,
  };
}

function serializeProvider(provider, approvedApplication = null) {
  return {
    id: id(provider._id),
    representativeId: id(provider.representativeId),
    businessRegistrationNumber: provider.businessRegistrationNumber,
    status: provider.status,
    approvedApplicationId: id(provider.approvedApplicationId),
    approvedProfile: approvedApplication ? serializeApplication(approvedApplication).profile : null,
    latestApplicationId: id(provider.latestApplicationId),
    suspensionReason: provider.suspensionReason || null,
    suspendedAt: provider.suspendedAt || null,
    reactivationNote: provider.reactivationNote || null,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

function serializePage(data, count, page, limit) {
  return {
    success: true,
    count: data.length,
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    data,
  };
}

module.exports = { serializeApplication, serializePage, serializeProvider };
