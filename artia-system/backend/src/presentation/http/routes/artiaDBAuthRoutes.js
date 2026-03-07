import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export function createArtiaDBAuthRoutes(artiaDBAuthController) {
  const router = Router();

  // Login com credenciais Artia (via banco MySQL)
  router.post('/login', (req, res, next) => 
    artiaDBAuthController.login(req, res, next)
  );

  // Validar usuário no banco Artia
  router.post('/validate', (req, res, next) => 
    artiaDBAuthController.validateUser(req, res, next)
  );

  // Buscar projetos do Artia (requer autenticação)
  router.get('/projects', authMiddleware, (req, res, next) => 
    artiaDBAuthController.getProjects(req, res, next)
  );

  // Buscar atividades de um projeto (requer autenticação)
  router.get('/projects/:projectId/activities', authMiddleware, (req, res, next) => 
    artiaDBAuthController.getProjectActivities(req, res, next)
  );

  // Sincronizar projetos e atividades do Artia (requer autenticação)
  router.post('/sync-projects', authMiddleware, (req, res, next) => 
    artiaDBAuthController.syncProjects(req, res, next)
  );

  return router;
}
