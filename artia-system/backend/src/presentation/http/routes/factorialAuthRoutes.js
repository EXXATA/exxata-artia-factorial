import { Router } from 'express';

export function createFactorialAuthRoutes(factorialAuthController) {
  const router = Router();

  router.post('/register', (req, res, next) => 
    factorialAuthController.register(req, res, next)
  );

  router.post('/login', (req, res, next) => 
    factorialAuthController.login(req, res, next)
  );

  return router;
}
