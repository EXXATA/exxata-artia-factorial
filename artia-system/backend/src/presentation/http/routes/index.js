import express from 'express';

export function createApiRoutes(controllers) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  return router;
}
