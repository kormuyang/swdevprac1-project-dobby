const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const {
  todayBangkok,
  validateDateOnly,
  inclusiveDays,
  validateRentalDates,
  overlaps,
  bookingStatus,
} = require('../utils/dates');

const TODAY = '2030-01-10';

function assertBadInput(work) {
  assert.throws(work, (error) => {
    assert.equal(error.constructor, Error);
    assert.equal(error.status, 400);
    assert.ok(error.message.length > 0);
    assert.equal(error.code, undefined);
    return true;
  });
}

test('calendar validation accepts real dates and leap years', () => {
  for (const date of ['0001-01-01', '0099-12-31', '2000-02-29', '2028-02-29', '9999-12-31']) {
    assert.equal(validateDateOnly(date), date);
  }
});

test('calendar validation rejects rollover dates, wrong formats and non-strings', () => {
  const invalidDates = [
    '0000-01-01', '1900-02-29', '2030-02-29', '2030-04-31',
    '2030-13-01', '2030-01-00', '2030-1-10', ' 2030-01-10',
    '2030-01-10\n', '2030-01-10T00:00:00Z', '', null, undefined,
    20300110, [], {}, { $gt: '' },
  ];
  for (const date of invalidDates) {
    assertBadInput(() => validateDateOnly(date));
  }
});

test('Bangkok today changes at 17:00 UTC, including the year boundary', () => {
  assert.equal(todayBangkok(new Date('2029-12-31T16:59:59.999Z')), '2029-12-31');
  assert.equal(todayBangkok(new Date('2029-12-31T17:00:00.000Z')), '2030-01-01');
  assert.equal(todayBangkok(new Date('2030-01-09T17:00:00.000Z')), TODAY);
  for (const now of [
    undefined, null, '2030-01-10', new Date(NaN),
    new Date('0000-01-01T00:00:00Z'),
    new Date('-000001-01-01T00:00:00Z'),
    new Date('+010000-01-01T00:00:00Z'),
  ]) {
    assertBadInput(() => todayBangkok(now));
  }
});

test('inclusive days handles same-day, month, year and leap-day boundaries', () => {
  assert.equal(inclusiveDays(TODAY, TODAY), 1);
  assert.equal(inclusiveDays('2030-01-31', '2030-02-01'), 2);
  assert.equal(inclusiveDays('2029-12-31', '2030-01-01'), 2);
  assert.equal(inclusiveDays('2028-02-28', '2028-03-01'), 3);
  assert.equal(inclusiveDays('2030-01-01', '2030-12-31'), 365);
  assertBadInput(() => inclusiveDays('2030-01-11', TODAY));
  assertBadInput(() => inclusiveDays('bad', TODAY));
});

test('new rentals allow today and 30 days, but reject past starts and 31 days', () => {
  assert.equal(validateRentalDates(TODAY, TODAY, TODAY), 1);
  assert.equal(validateRentalDates(TODAY, '2030-02-08', TODAY), 30);
  assert.equal(validateRentalDates('2031-01-01', '2031-01-02', TODAY), 2);
  assertBadInput(() => validateRentalDates('2030-01-09', TODAY, TODAY));
  assertBadInput(() => validateRentalDates(TODAY, '2030-02-09', TODAY));
  assertBadInput(() => validateRentalDates('2030-01-11', TODAY, TODAY));
  assertBadInput(() => validateRentalDates('2030-02-30', '2030-03-01', TODAY));
  assertBadInput(() => validateRentalDates(TODAY, TODAY, 'bad'));
});

test('overlap includes shared endpoints, containment and identical ranges', () => {
  assert.equal(overlaps('2030-01-10', '2030-01-12', '2030-01-12', '2030-01-14'), true);
  assert.equal(overlaps('2030-01-10', '2030-01-12', '2030-01-13', '2030-01-14'), false);
  assert.equal(overlaps('2030-01-13', '2030-01-14', '2030-01-10', '2030-01-12'), false);
  assert.equal(overlaps('2030-01-01', '2030-01-30', TODAY, TODAY), true);
  assert.equal(overlaps(TODAY, TODAY, TODAY, TODAY), true);
  assertBadInput(() => overlaps('2030-01-11', TODAY, TODAY, TODAY));
  assertBadInput(() => overlaps(TODAY, TODAY, 'bad', TODAY));
});

test('booking status includes both rental endpoints and preserves cancellation', () => {
  const booking = { state: 'confirmed', startDate: '2030-01-10', dueDate: '2030-01-12' };
  assert.equal(bookingStatus(booking, '2030-01-09'), 'upcoming');
  assert.equal(bookingStatus(booking, TODAY), 'ongoing');
  assert.equal(bookingStatus(booking, '2030-01-12'), 'ongoing');
  assert.equal(bookingStatus(booking, '2030-01-13'), 'completed');
  assert.equal(bookingStatus({ ...booking, dueDate: TODAY }, TODAY), 'ongoing');
  for (const today of ['2030-01-09', TODAY, '2030-01-13']) {
    assert.equal(bookingStatus({ ...booking, state: 'cancelled' }, today), 'cancelled');
  }
  assertBadInput(() => bookingStatus(null, TODAY));
  assertBadInput(() => bookingStatus({ ...booking, state: 'completed' }, TODAY));
  assertBadInput(() => bookingStatus({ ...booking, dueDate: 'bad' }, TODAY));
});

test('date calculations stay the same under different server timezones', () => {
  const helperPath = path.resolve(__dirname, '../utils/dates.js');
  const script = `
    const dates = require(${JSON.stringify(helperPath)});
    process.stdout.write(JSON.stringify([
      dates.todayBangkok(new Date('2030-01-09T17:00:00Z')),
      dates.inclusiveDays('2030-03-09', '2030-03-11'),
      dates.validateRentalDates('2030-01-10', '2030-02-08', '2030-01-10')
    ]));
  `;
  for (const timezone of ['UTC', 'Asia/Bangkok', 'America/New_York']) {
    const result = spawnSync(process.execPath, ['-e', script], {
      env: { ...process.env, TZ: timezone },
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [TODAY, 3, 30]);
  }
});
