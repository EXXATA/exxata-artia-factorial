/**
 * Sync Activities - Sincroniza atividades do Artia MySQL para Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Logger } from './utils/logger.ts';
import { processBatch } from './utils/batch-processor.ts';
import { handleError } from './utils/error-handler.ts';

interface ArtiaActivity {
  id: string;
  projectId: string;
  label: string;
  artiaId: string;
  active: boolean;
}

interface ActivityToSync {
  activityId: string;
  projectId: string;
  label: string;
  artiaId: string;
  active: boolean;
  source: string;
  syncScopeKey: string;
  lastSyncedAt: string;
}

export async function syncActivities(
  supabaseUrl: string,
  supabaseKey: string,
  logger: Logger
) {
  const startTime = Date.now();
  logger.info('Starting activity synchronization');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar projetos existentes no Supabase para validação
    logger.info('Fetching existing projects for validation');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('project_id');

    if (projectsError) {
      throw projectsError;
    }

    const validProjectIds = new Set(projects?.map((p: any) => p.project_id) || []);
    logger.info(`Found ${validProjectIds.size} valid project IDs`);

    // 2. Buscar atividades do Artia via backend API
    logger.info('Fetching Artia activities');
    const artiaActivities = await fetchArtiaActivities();
    logger.info(`Found ${artiaActivities.length} Artia activities`);

    // 3. Filtrar atividades com projetos válidos
    const validActivities = artiaActivities.filter((activity) =>
      validProjectIds.has(activity.projectId)
    );

    const invalidCount = artiaActivities.length - validActivities.length;
    if (invalidCount > 0) {
      logger.warn(`Skipped ${invalidCount} activities with invalid project references`);
    }

    // 4. Preparar dados para sincronização
    const syncedAt = new Date().toISOString();
    const activitiesToSync: ActivityToSync[] = validActivities.map((activity) => ({
      activityId: activity.id,
      projectId: activity.projectId,
      label: activity.label,
      artiaId: activity.artiaId,
      active: activity.active,
      source: 'artia_mysql',
      syncScopeKey: 'global',
      lastSyncedAt: syncedAt,
    }));

    // 5. Sincronizar em lotes
    const result = await processBatch(
      activitiesToSync,
      async (batch) => {
        return await upsertActivitiesBatch(supabase, batch);
      },
      {
        batchSize: 500,
        parallel: false,
        retryAttempts: 3,
      }
    );

    const duration = Date.now() - startTime;

    logger.metrics('Activity synchronization completed', {
      total: result.total,
      inserted: result.successCount,
      failed: result.failureCount,
      skipped: invalidCount,
      duration_ms: duration,
    });

    if (result.failed.length > 0) {
      logger.warn(`${result.failed.length} activities failed to sync`, {
        failures: result.failed.slice(0, 10),
      });
    }

    return {
      success: true,
      total: result.total,
      synced: result.successCount,
      failed: result.failureCount,
      skipped: invalidCount,
      duration_ms: duration,
    };
  } catch (error) {
    throw handleError(error, 'sync-activities', logger);
  }
}

/**
 * Busca atividades do Artia via MySQL direto
 */
async function fetchArtiaActivities(): Promise<ArtiaActivity[]> {
  const { executeQuery } = await import('./utils/mysql-client.ts');
  
  const query = `
    SELECT 
      id,
      parent_id as projectId,
      title as label,
      id as artiaId,
      activity_status as active
    FROM organization_9115_activities_v2 
    WHERE status = 1
    ORDER BY parent_id, title
  `;

  console.log('[ACTIVITIES] Executando query MySQL...');
  const rows = await executeQuery<any>(query);
  console.log(`[ACTIVITIES] Query retornou ${rows.length} registros`);
  
  if (rows.length > 0) {
    console.log('[ACTIVITIES] Primeiros 3 registros:', JSON.stringify(rows.slice(0, 3)));
  }
  
  const mapped = rows.map((row) => ({
    id: String(row.id),
    projectId: String(row.projectId),
    label: row.label,
    artiaId: String(row.artiaId),
    active: row.active === 1,
  }));
  
  console.log(`[ACTIVITIES] Mapeadas ${mapped.length} atividades`);
  return mapped;
}

/**
 * Insere/atualiza lote de atividades no Supabase
 */
async function upsertActivitiesBatch(
  supabase: any,
  activities: ActivityToSync[]
): Promise<ActivityToSync[]> {
  const { data, error } = await supabase
    .from('activities')
    .upsert(
      activities.map((activity) => ({
        activity_id: activity.activityId,
        project_id: activity.projectId,
        label: activity.label,
        artia_id: activity.artiaId,
        active: activity.active,
        source: activity.source,
        sync_scope_key: activity.syncScopeKey,
        last_synced_at: activity.lastSyncedAt,
        updated_at: new Date().toISOString(),
      })),
      {
        onConflict: 'activity_id',
        ignoreDuplicates: false,
      }
    )
    .select();

  if (error) {
    throw error;
  }

  return activities;
}
