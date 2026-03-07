import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export function createExportRoutes(exportController) {
  const router = express.Router();

  router.get(
    '/csv',
    authMiddleware,
    (req, res, next) => exportController.exportCSV(req, res, next)
  );

  router.get(
    '/xlsx',
    authMiddleware,
    (req, res, next) => exportController.exportXLSX(req, res, next)
  );

  return router;
}
