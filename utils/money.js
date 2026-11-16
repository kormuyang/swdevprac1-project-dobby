const AppError = require('./AppError');
function calculateTotal(ratePerDaySatang, rentalDays) {
  if (
    !Number.isSafeInteger(ratePerDaySatang) ||
    ratePerDaySatang < 1 ||
    ratePerDaySatang > 1_000_000_000 ||
    !Number.isSafeInteger(rentalDays) ||
    rentalDays < 1 ||
    rentalDays > 30
  ) {
    throw new AppError(
      400,
      'Use an integer daily rate of 1–1,000,000,000 satang and 1–30 rental days.',
    );
  }

  return ratePerDaySatang * rentalDays;
}

module.exports = { calculateTotal };
