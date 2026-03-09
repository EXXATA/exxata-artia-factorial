/**
 * Error Handler - Tratamento centralizado de erros
 */

import { Logger } from './logger.ts';

export class SyncError extends Error {
  constructor(
    message: string,
    public stage: string,
    public originalError?: any,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export interface ErrorSummary {
  stage: string;
  errorCount: number;
  errors: Array<{
    message: string;
    error: any;
    timestamp: string;
  }>;
  recoverable: boolean;
}

/**
 * Manipula erros durante a sincronização
 */
export function handleError(
  error: any,
  stage: string,
  logger: Logger,
  context?: any
): SyncError {
  const message = error?.message || 'Unknown error';
  
  logger.error(`Error in ${stage}`, error, context);

  // Determina se o erro é recuperável
  const recoverable = isRecoverableError(error);

  return new SyncError(message, stage, error, recoverable);
}

/**
 * Verifica se um erro é recuperável
 */
function isRecoverableError(error: any): boolean {
  // Erros de rede são recuperáveis
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    return true;
  }

  // Erros de rate limit são recuperáveis
  if (error?.response?.status === 429) {
    return true;
  }

  // Erros de timeout são recuperáveis
  if (error?.message?.includes('timeout')) {
    return true;
  }

  // Erros de constraint violation não são recuperáveis
  if (error?.code === '23505' || error?.code === '23503') {
    return false;
  }

  // Por padrão, considerar recuperável
  return true;
}

/**
 * Gera resumo de erros
 */
export function generateErrorSummary(
  errors: Array<{ item: any; error: any }>,
  stage: string
): ErrorSummary {
  return {
    stage,
    errorCount: errors.length,
    errors: errors.map((e) => ({
      message: e.error?.message || 'Unknown error',
      error: e.error,
      timestamp: new Date().toISOString(),
    })),
    recoverable: errors.every((e) => isRecoverableError(e.error)),
  };
}

/**
 * Verifica se deve enviar alerta
 */
export function shouldAlert(errorRate: number, threshold: number = 10): boolean {
  return errorRate > threshold;
}

/**
 * Formata mensagem de alerta
 */
export function formatAlertMessage(
  stage: string,
  errorRate: number,
  errorCount: number,
  total: number
): string {
  return `⚠️ High error rate in ${stage}: ${errorRate.toFixed(2)}% (${errorCount}/${total} failed)`;
}
