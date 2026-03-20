import jwt from 'jsonwebtoken';
import { UserRepository } from '../../../infrastructure/database/supabase/UserRepository.js';
import { getUserFromAccessToken } from '../../../infrastructure/database/supabase/supabaseClient.js';

const userRepository = new UserRepository();

export async function authMiddleware(req, res, next) {
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

    try {
      const authUser = await getUserFromAccessToken(token);
      if (authUser) {
        const profile = await userRepository.findById(authUser.id);

        req.user = {
          userId: authUser.id,
          id: authUser.id,
          email: authUser.email,
          artiaUserId: profile?.artiaUserId || null,
          factorialEmployeeId: profile?.factorialEmployeeId || null,
          name: profile?.name || authUser.user_metadata?.name || null
        };
        req.auth = {
          type: 'supabase',
          accessToken: token
        };

        return next();
      }
    } catch (error) {
      // Fallback temporário para tokens legados durante a migração.
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
        artiaUserId: decoded.artiaUserId,
        factorialEmployeeId: decoded.factorialEmployeeId
      };
      req.auth = {
        type: 'legacy',
        accessToken: null
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
