export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  if (err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      message: err.message
    });
  }

  if (err.message.includes('overlaps') || err.message.includes('conflict')) {
    return res.status(409).json({
      success: false,
      message: err.message
    });
  }

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
}
