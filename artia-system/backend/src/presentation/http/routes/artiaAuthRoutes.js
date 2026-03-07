import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export function createArtiaAuthRoutes(artiaAuthController) {
  const router = Router();

  // Login com credenciais Artia
  router.post('/login', (req, res, next) => 
    artiaAuthController.login(req, res, next)
  );

  // Validar token Artia
  router.post('/validate', (req, res, next) => 
    artiaAuthController.validateArtiaToken(req, res, next)
  );

  // Sincronizar projetos do Artia (requer autenticação)
  router.post('/sync-projects', authMiddleware, (req, res, next) => 
    artiaAuthController.syncProjects(req, res, next)
  );

  return router;
}
