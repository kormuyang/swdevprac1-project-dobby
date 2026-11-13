function rejectQuery(req, res, next) {
  if (Object.keys(req.query).length > 0) {
    return res.status(400).json({ success: false, message: 'Query parameters are not allowed.' });
  }
  return next();
}

module.exports = { rejectQuery };
