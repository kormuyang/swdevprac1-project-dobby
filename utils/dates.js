const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function rejectDate(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function todayBangkok(now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    rejectDate('A valid current time is required.');
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    era: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  if (parts.find((part) => part.type === 'era').value !== 'AD') {
    rejectDate('Use a current time between years 0001 and 9999.');
  }
  const year = parts.find((part) => part.type === 'year').value.padStart(4, '0');
  const month = parts.find((part) => part.type === 'month').value;
  const day = parts.find((part) => part.type === 'day').value;
  return validateDateOnly(`${year}-${month}-${day}`);
}

function validateDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    rejectDate('Use a date in YYYY-MM-DD format.');
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  // JavaScript can roll February 30 into March; compare to the original date.
  if (
    value.startsWith('0000-') ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    rejectDate('Use a real calendar date between years 0001 and 9999.');
  }
  return value;
}

function inclusiveDays(startDate, dueDate) {
  validateDateOnly(startDate);
  validateDateOnly(dueDate);
  if (startDate > dueDate) {
    rejectDate('The due date must be on or after the start date.');
  }

  // UTC midnight counts calendar days without depending on the server timezone.
  const startTime = Date.parse(`${startDate}T00:00:00.000Z`);
  const dueTime = Date.parse(`${dueDate}T00:00:00.000Z`);
  return (dueTime - startTime) / MILLISECONDS_PER_DAY + 1;
}

function validateRentalDates(startDate, dueDate, today) {
  validateDateOnly(today);
  const rentalDays = inclusiveDays(startDate, dueDate);
  if (startDate < today) {
    rejectDate('The rental must start today or later.');
  }
  if (rentalDays > 30) {
    rejectDate('A rental must last between 1 and 30 days.');
  }
  return rentalDays;
}

function overlaps(aStart, aDue, bStart, bDue) {
  inclusiveDays(aStart, aDue);
  inclusiveDays(bStart, bDue);
  return aStart <= bDue && aDue >= bStart;
}

function bookingStatus(booking, today) {
  if (!booking || (booking.state !== 'confirmed' && booking.state !== 'cancelled')) {
    rejectDate('A booking must have a confirmed or cancelled state.');
  }
  validateDateOnly(today);
  inclusiveDays(booking.startDate, booking.dueDate);

  if (booking.state === 'cancelled') {
    return 'cancelled';
  }
  if (booking.startDate > today) {
    return 'upcoming';
  }
  if (booking.dueDate < today) {
    return 'completed';
  }
  return 'ongoing';
}

module.exports = {
  todayBangkok,
  validateDateOnly,
  inclusiveDays,
  validateRentalDates,
  overlaps,
  bookingStatus,
};
