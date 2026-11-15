function calculateTotal(ratePerDaySatang, rentalDays) {
  if (
    !Number.isSafeInteger(ratePerDaySatang) ||
    ratePerDaySatang < 1 ||
    ratePerDaySatang > 1_000_000_000 ||
    !Number.isSafeInteger(rentalDays) ||
    rentalDays < 1 ||
    rentalDays > 30
  ) {
    const error = new Error('Use an integer daily rate of 1–1,000,000,000 satang and 1–30 rental days.');
    error.status = 400;
    throw error;
  }

  return ratePerDaySatang * rentalDays;
}

module.exports = { calculateTotal };
