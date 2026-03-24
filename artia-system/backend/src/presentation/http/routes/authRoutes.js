import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export function createAuthRoutes(authController) {
  const router = express.Router();

  router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

  return router;
}
