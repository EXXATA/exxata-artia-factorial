import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Token error'
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({
        success: false,
        message: 'Token malformatted'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Token invalid'
        });
      }

      req.user = {
        userId: decoded.userId,
        id: decoded.userId,
        email: decoded.email,
        artiaUserId: decoded.artiaUserId
      };

      return next();
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalid'
    });
  }
}
