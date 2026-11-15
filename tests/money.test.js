const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTotal } = require('../utils/money');

test('total uses integer satang, including minimum and maximum values', () => {
  assert.equal(calculateTotal(100_000, 3), 300_000);
  assert.equal(calculateTotal(12_345, 2), 24_690);
  assert.equal(calculateTotal(1, 1), 1);
  assert.equal(calculateTotal(1_000_000_000, 30), 30_000_000_000);
});

test('total rejects invalid rates and rental lengths without coercing strings', () => {
  const invalidRates = [0, -1, 1.5, 1_000_000_001, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '100', null, undefined, {}, []];
  const invalidDays = [0, -1, 1.5, 31, NaN, Infinity, '3', null, undefined, {}, []];
  const invalidPairs = [
    ...invalidRates.map((rate) => [rate, 1]),
    ...invalidDays.map((days) => [100, days]),
  ];
  for (const [rate, days] of invalidPairs) {
    assert.throws(() => calculateTotal(rate, days), (error) => {
      assert.equal(error.constructor, Error);
      assert.equal(error.status, 400);
      assert.ok(error.message.length > 0);
      assert.equal(error.code, undefined);
      return true;
    });
  }
});
