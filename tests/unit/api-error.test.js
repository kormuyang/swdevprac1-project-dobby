const test = require('node:test');
const assert = require('node:assert/strict');

const ApiError = require('../../utils/ApiError');
const errorMiddleware = require('../../middleware/error');

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('ApiError stores the agreed HTTP fields', () => {
  const error = new ApiError(409, 'WRITE_CONFLICT', 'Please retry.');

  assert.equal(error.name, 'ApiError');
  assert.equal(error.status, 409);
  assert.equal(error.code, 'WRITE_CONFLICT');
  assert.equal(error.message, 'Please retry.');
});

test('error middleware returns safe ApiError responses', () => {
  const res = responseRecorder();

  errorMiddleware(new ApiError(404, 'NOT_FOUND', 'Not found.'), {}, res, assert.fail);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    success: false,
    code: 'NOT_FOUND',
    message: 'Not found.',
  });
});

test('error middleware hides unexpected error details', () => {
  const res = responseRecorder();

  errorMiddleware(new Error('database credentials must not leak'), {}, res, assert.fail);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  });
});
