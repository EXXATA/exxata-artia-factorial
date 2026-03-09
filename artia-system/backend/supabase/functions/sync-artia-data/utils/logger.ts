/**
 * Logger - Sistema de logs estruturados para Edge Functions
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  stage?: string;
  message: string;
  data?: any;
  error?: any;
}

export class Logger {
  private stage: string;
  private logs: LogEntry[] = [];

  constructor(stage: string) {
    this.stage = stage;
  }

  private log(level: LogLevel, message: string, data?: any, error?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      stage: this.stage,
      message,
      data,
      error: error ? this.serializeError(error) : undefined,
    };

    this.logs.push(entry);

    // Console output para desenvolvimento
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleMethod(JSON.stringify(entry, null, 2));
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any, data?: any) {
    this.log('error', message, data, error);
  }

  /**
   * Loga métricas de performance
   */
  metrics(message: string, metrics: {
    total?: number;
    inserted?: number;
    updated?: number;
    failed?: number;
    duration_ms?: number;
    [key: string]: any;
  }) {
    this.info(message, { metrics });
  }

  /**
   * Serializa erro para JSON
   */
  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return error;
  }

  /**
   * Retorna todos os logs
   */
  getLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Retorna apenas logs de erro
   */
  getErrors(): LogEntry[] {
    return this.logs.filter((log) => log.level === 'error');
  }

  /**
   * Calcula taxa de erro
   */
  getErrorRate(): number {
    if (this.logs.length === 0) return 0;
    return (this.getErrors().length / this.logs.length) * 100;
  }
}

/**
 * Cria um logger para um estágio específico
 */
export function createLogger(stage: string): Logger {
  return new Logger(stage);
}

/**
 * Formata duração em ms para string legível
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}
