import { Router } from 'express';

export function createViewRoutes(viewController, authMiddleware) {
  const router = Router();

  router.use(authMiddleware);

  router.get('/week', (req, res, next) =>
    viewController.getWeek(req, res, next)
  );

  router.get('/range-summary', (req, res, next) =>
    viewController.getRangeSummary(req, res, next)
  );

  return router;
}
