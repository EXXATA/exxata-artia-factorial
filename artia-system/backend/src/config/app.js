import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const fallbackEnvPath = path.join(backendRoot, 'env');

if (fs.existsSync(fallbackEnvPath)) {
  dotenv.config({ path: fallbackEnvPath, override: false });
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  microsoftAllowedDomain: process.env.MICROSOFT_ALLOWED_DOMAIN || 'exxata.com.br',
  microsoftTenantId: process.env.MICROSOFT_ALLOWED_TENANT_ID || null,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/artia',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760
};
