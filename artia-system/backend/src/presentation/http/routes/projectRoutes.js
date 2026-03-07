import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const upload = multer({ storage: multer.memoryStorage() });

export function createProjectRoutes(projectController) {
  const router = express.Router();

  router.post(
    '/import',
    authMiddleware,
    upload.single('file'),
    (req, res, next) => projectController.import(req, res, next)
  );

  router.get(
    '/',
    authMiddleware,
    (req, res, next) => projectController.list(req, res, next)
  );

  router.get(
    '/search',
    authMiddleware,
    (req, res, next) => projectController.search(req, res, next)
  );

  router.get(
    '/:id/activities',
    authMiddleware,
    (req, res, next) => projectController.getActivities(req, res, next)
  );

  return router;
}
