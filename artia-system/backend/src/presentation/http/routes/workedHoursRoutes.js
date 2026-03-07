import { Router } from 'express';

export function createWorkedHoursRoutes(workedHoursController, authMiddleware) {
  const router = Router();

  // Todas as rotas requerem autenticação
  router.use(authMiddleware);

  router.get('/daily', (req, res, next) => 
    workedHoursController.getDailyComparison(req, res, next)
  );

  router.get('/monthly', (req, res, next) => 
    workedHoursController.getMonthlyComparison(req, res, next)
  );

  router.get('/history', (req, res, next) => 
    workedHoursController.getFullHistory(req, res, next)
  );

  return router;
}
