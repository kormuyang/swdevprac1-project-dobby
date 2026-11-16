const AppError = require('../utils/AppError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }
  let status = 500;
  let message = 'The request could not be completed.';
  if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body must contain valid JSON.';
  } else if (error.type === 'entity.too.large') {
    status = 413;
    message = 'The request body exceeds the 100 KB limit.';
  } else if (error.type === 'charset.unsupported' || error.type === 'encoding.unsupported') {
    status = 415;
    message = 'The request uses an unsupported charset or content encoding.';
  } else if (error.type === 'request.aborted' || error.type === 'request.size.invalid') {
    status = 400;
    message = 'The request body could not be read.';
  } else if (
    error instanceof AppError &&
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status <= 599
  ) {
    status = error.status;
    if (status < 500) {
      message = error.message;
    }
  }
  return res.status(status).json({ success: false, message });
}

module.exports = { errorHandler };
