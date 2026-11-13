function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Request body must contain valid JSON.',
    });
    return;
  }

  if (error.type === 'entity.too.large') {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Request body exceeds the 16 KiB limit.',
    });
    return;
  }

  if (error.name === 'ApiError') {
    res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  });
}

module.exports = errorMiddleware;
