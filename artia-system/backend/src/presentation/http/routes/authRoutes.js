import express from 'express';
import { body } from 'express-validator';
import { validationMiddleware } from '../middlewares/validationMiddleware.js';
import { strictRateLimitMiddleware } from '../middlewares/rateLimitMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export function createAuthRoutes(authController) {
  const router = express.Router();

  router.post(
    '/login',
    strictRateLimitMiddleware,
    [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').notEmpty().withMessage('Password is required')
    ],
    validationMiddleware,
    (req, res, next) => authController.login(req, res, next)
  );

  router.post(
    '/register',
    strictRateLimitMiddleware,
    [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ],
    validationMiddleware,
    (req, res, next) => authController.register(req, res, next)
  );

  router.post(
    '/refresh',
    [
      body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    validationMiddleware,
    (req, res, next) => authController.refresh(req, res, next)
  );

  router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

  return router;
}
