function serializeVehicleSnapshot(vehicle) {
  const snapshot = {
    vin: vehicle.vin,
    model: vehicle.model,
    transmissionType: vehicle.transmissionType,
    fuelType: vehicle.fuelType,
    seatingCapacity: vehicle.seatingCapacity,
    pickupBranch: {
      name: vehicle.pickupBranch.name,
      address: vehicle.pickupBranch.address,
    },
  };
  if (vehicle.brand !== undefined) {
    snapshot.brand = vehicle.brand;
  }
  if (vehicle.modelYear !== undefined) {
    snapshot.modelYear = vehicle.modelYear;
  }
  return snapshot;
}

function serializeVehicle(vehicle) {
  return {
    id: String(vehicle._id),
    providerId: String(vehicle.providerId),
    ...serializeVehicleSnapshot(vehicle),
    ratePerDaySatang: vehicle.ratePerDaySatang,
    availableFrom: vehicle.availableFrom,
    availableUntil: vehicle.availableUntil,
    isActive: vehicle.isActive,
    createdAt: new Date(vehicle.createdAt).toISOString(),
    updatedAt: new Date(vehicle.updatedAt).toISOString(),
  };
}

module.exports = { serializeVehicle, serializeVehicleSnapshot };
