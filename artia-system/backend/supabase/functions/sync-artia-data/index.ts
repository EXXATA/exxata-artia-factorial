/**
 * Sync Artia Data - Edge Function Principal
 * Sincroniza dados do Artia MySQL e Factorial para Supabase
 * Execução: Diariamente às 05:00 AM via cron job
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createLogger, formatDuration } from './utils/logger.ts';
import { shouldAlert, formatAlertMessage } from './utils/error-handler.ts';
import { syncUsers } from './sync-users.ts';
import { syncProjects } from './sync-projects.ts';
import { syncActivities } from './sync-activities.ts';
import { syncHoursCache } from './sync-hours-cache.ts';

interface SyncRequest {
  stages?: string[]; // ['users', 'projects', 'activities', 'cache']
  initialSync?: boolean; // true = população inicial (90 dias), false = sync diária (7 dias)
  forceRefresh?: boolean;
}

interface SyncResponse {
  success: boolean;
  stages: {
    users?: any;
    projects?: any;
    activities?: any;
    cache?: any;
  };
  summary: {
    totalDuration: number;
    errors: string[];
    warnings: string[];
  };
  timestamp: string;
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const logger = createLogger('sync-artia-data');

  try {
    // 1. Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validar autenticação (TEMPORARIAMENTE DESABILITADO PARA TESTES)
    // const authHeader = req.headers.get('Authorization');
    // const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`;
    // 
    // if (authHeader !== expectedAuth) {
    //   logger.warn('Unauthorized access attempt');
    //   return new Response(
    //     JSON.stringify({ error: 'Unauthorized' }),
    //     { status: 401, headers: { 'Content-Type': 'application/json' } }
    //   );
    // }
    logger.info('Auth validation disabled for testing');

    // 3. Parsear request
    let requestBody: SyncRequest = {};
    try {
      requestBody = await req.json();
    } catch {
      // Se não houver body, usar configuração padrão
      requestBody = {};
    }

    const {
      stages = ['users', 'projects', 'activities', 'cache'],
      initialSync = false,
      forceRefresh = false,
    } = requestBody;

    logger.info('Starting synchronization', {
      stages,
      initialSync,
      forceRefresh,
    });

    // 4. Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const factorialApiKey = Deno.env.get('FACTORIAL_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !factorialApiKey) {
      throw new Error('Missing required environment variables');
    }

    const artiaDbConfig = {
      host: Deno.env.get('ARTIA_DB_HOST'),
      port: Deno.env.get('ARTIA_DB_PORT'),
      user: Deno.env.get('ARTIA_DB_USER'),
      password: Deno.env.get('ARTIA_DB_PASSWORD'),
      database: Deno.env.get('ARTIA_DB_NAME'),
    };

    // 5. Executar sincronização por estágios
    const results: SyncResponse['stages'] = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    // Estágio 1: Usuários
    if (stages.includes('users')) {
      try {
        logger.info('=== Stage 1: Syncing Users ===');
        results.users = await syncUsers(
          supabaseUrl,
          supabaseKey,
          factorialApiKey,
          artiaDbConfig,
          createLogger('sync-users')
        );
        logger.info('Users sync completed', results.users);
      } catch (error) {
        const errorMsg = `Users sync failed: ${error.message}`;
        errors.push(errorMsg);
        logger.error(errorMsg, error);
        results.users = { success: false, error: error.message };
      }
    }

    // Estágio 2: Projetos
    if (stages.includes('projects')) {
      try {
        logger.info('=== Stage 2: Syncing Projects ===');
        results.projects = await syncProjects(
          supabaseUrl,
          supabaseKey,
          createLogger('sync-projects')
        );
        logger.info('Projects sync completed', results.projects);
      } catch (error) {
        const errorMsg = `Projects sync failed: ${error.message}`;
        errors.push(errorMsg);
        logger.error(errorMsg, error);
        results.projects = { success: false, error: error.message };
      }
    }

    // Estágio 3: Atividades
    if (stages.includes('activities')) {
      try {
        logger.info('=== Stage 3: Syncing Activities ===');
        results.activities = await syncActivities(
          supabaseUrl,
          supabaseKey,
          createLogger('sync-activities')
        );
        logger.info('Activities sync completed', results.activities);
      } catch (error) {
        const errorMsg = `Activities sync failed: ${error.message}`;
        errors.push(errorMsg);
        logger.error(errorMsg, error);
        results.activities = { success: false, error: error.message };
      }
    }

    // Estágio 4: Cache de Horas
    if (stages.includes('cache')) {
      try {
        logger.info('=== Stage 4: Syncing Hours Cache ===');
        results.cache = await syncHoursCache(
          supabaseUrl,
          supabaseKey,
          factorialApiKey,
          createLogger('sync-hours-cache'),
          {
            syncFactorial: true,
            syncArtia: true,
            daysToSync: initialSync ? 90 : 7, // 90 dias na inicial, 7 dias na diária
          }
        );
        logger.info('Hours cache sync completed', results.cache);
      } catch (error) {
        const errorMsg = `Hours cache sync failed: ${error.message}`;
        errors.push(errorMsg);
        logger.error(errorMsg, error);
        results.cache = { success: false, error: error.message };
      }
    }

    // 6. Calcular métricas finais
    const totalDuration = Date.now() - startTime;
    const errorRate = logger.getErrorRate();

    // 7. Verificar se deve enviar alerta
    if (shouldAlert(errorRate)) {
      const alertMsg = formatAlertMessage(
        'sync-artia-data',
        errorRate,
        errors.length,
        stages.length
      );
      warnings.push(alertMsg);
      logger.warn(alertMsg);
    }

    // 8. Preparar resposta
    const response: SyncResponse = {
      success: errors.length === 0,
      stages: results,
      summary: {
        totalDuration,
        errors,
        warnings,
      },
      timestamp: new Date().toISOString(),
    };

    logger.metrics('Synchronization completed', {
      success: response.success,
      total_duration_ms: totalDuration,
      total_duration: formatDuration(totalDuration),
      error_count: errors.length,
      warning_count: warnings.length,
      error_rate: errorRate,
    });

    // 9. Retornar resposta
    return new Response(JSON.stringify(response, null, 2), {
      status: response.success ? 200 : 207, // 207 = Multi-Status (sucesso parcial)
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Fatal error in sync-artia-data', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
