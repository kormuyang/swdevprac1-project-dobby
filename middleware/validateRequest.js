function rejectQuery(req, res, next) {
  if (Object.keys(req.query).length > 0) {
    return res.status(400).json({ success: false, message: 'Query parameters are not allowed.' });
  }
  return next();
}

function rejectBody(req, res, next) {
  if (req.body !== undefined || Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding')) {
    return res.status(400).json({ success: false, message: 'This request does not accept a body.' });
  }
  return next();
}

module.exports = { rejectBody, rejectQuery };
