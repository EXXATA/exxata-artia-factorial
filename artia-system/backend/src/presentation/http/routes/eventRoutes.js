import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validationMiddleware } from '../middlewares/validationMiddleware.js';
import { eventValidator } from '../validators/eventValidator.js';

const upload = multer({ storage: multer.memoryStorage() });

export function createEventRoutes(eventController) {
  const router = express.Router();

  router.post(
    '/import/analyze',
    authMiddleware,
    upload.single('file'),
    (req, res, next) => eventController.analyzeImport(req, res, next)
  );

  router.post(
    '/import/apply',
    authMiddleware,
    eventValidator.importApply,
    validationMiddleware,
    (req, res, next) => eventController.applyImport(req, res, next)
  );

  router.post(
    '/import',
    authMiddleware,
    upload.single('file'),
    eventValidator.importLegacy,
    validationMiddleware,
    (req, res, next) => eventController.importLegacy(req, res, next)
  );

  router.post(
    '/',
    authMiddleware,
    eventValidator.create,
    validationMiddleware,
    (req, res, next) => eventController.create(req, res, next)
  );

  router.get(
    '/',
    authMiddleware,
    (req, res, next) => eventController.list(req, res, next)
  );

  router.get(
    '/:id',
    authMiddleware,
    (req, res, next) => eventController.getById(req, res, next)
  );

  router.put(
    '/:id',
    authMiddleware,
    eventValidator.update,
    validationMiddleware,
    (req, res, next) => eventController.update(req, res, next)
  );

  router.patch(
    '/:id/move',
    authMiddleware,
    eventValidator.move,
    validationMiddleware,
    (req, res, next) => eventController.move(req, res, next)
  );

  router.delete(
    '/:id',
    authMiddleware,
    (req, res, next) => eventController.delete(req, res, next)
  );

  return router;
}
