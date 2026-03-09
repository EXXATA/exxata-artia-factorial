/**
 * Sync Projects - Sincroniza projetos do Artia MySQL para Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Logger } from './utils/logger.ts';
import { processBatch } from './utils/batch-processor.ts';
import { handleError } from './utils/error-handler.ts';

interface ArtiaProject {
  id: string;
  number: string;
  name: string;
  active: boolean;
  createdAt: string;
}

interface ProjectToSync {
  projectId: string;
  number: string;
  name: string;
  active: boolean;
  source: string;
  syncScopeKey: string;
  lastSyncedAt: string;
}

function normalizeProjectNumber(number: string | null | undefined, id: string): string {
  const normalized = String(number || '').trim();
  return normalized || `SEM-NUMERO-${id}`;
}

export async function syncProjects(
  supabaseUrl: string,
  supabaseKey: string,
  logger: Logger
) {
  const startTime = Date.now();
  logger.info('Starting project synchronization');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar projetos do Artia via backend API
    logger.info('Fetching Artia projects');
    const artiaProjects = await fetchArtiaProjects();
    logger.info(`Found ${artiaProjects.length} Artia projects`);

    // 2. Preparar dados para sincronização
    const syncedAt = new Date().toISOString();
    const projectsToSync: ProjectToSync[] = artiaProjects.map((project) => ({
      projectId: project.id,
      number: project.number,
      name: project.name,
      active: project.active,
      source: 'artia_mysql',
      syncScopeKey: 'global',
      lastSyncedAt: syncedAt,
    }));

    // 3. Sincronizar em lotes
    const result = await processBatch(
      projectsToSync,
      async (batch) => {
        return await upsertProjectsBatch(supabase, batch);
      },
      {
        batchSize: 200,
        parallel: false,
        retryAttempts: 3,
      }
    );

    // 4. Atualizar estado de sincronização
    await updateSyncState(supabase, syncedAt, result.successCount, logger);

    const duration = Date.now() - startTime;

    logger.metrics('Project synchronization completed', {
      total: result.total,
      inserted: result.successCount,
      failed: result.failureCount,
      duration_ms: duration,
    });

    if (result.failed.length > 0) {
      logger.warn(`${result.failed.length} projects failed to sync`, {
        failures: result.failed.slice(0, 10),
      });
    }

    return {
      success: true,
      total: result.total,
      synced: result.successCount,
      failed: result.failureCount,
      duration_ms: duration,
    };
  } catch (error) {
    throw handleError(error, 'sync-projects', logger);
  }
}

/**
 * Busca projetos do Artia via MySQL direto
 */
async function fetchArtiaProjects(): Promise<ArtiaProject[]> {
  const { executeQuery } = await import('./utils/mysql-client.ts');
  
  const query = `
    SELECT 
      id,
      project_number as number,
      name,
      status as active,
      created_at as createdAt
    FROM organization_9115_projects_v2 
    WHERE object_type = 'project'
    ORDER BY name
  `;

  console.log('[PROJECTS] Executando query MySQL...');
  const rows = await executeQuery<any>(query);
  console.log(`[PROJECTS] Query retornou ${rows.length} registros`);
  
  if (rows.length > 0) {
    console.log('[PROJECTS] Primeiros 3 registros:', JSON.stringify(rows.slice(0, 3)));
  }
  
  const mapped = rows.map((row) => ({
    id: String(row.id),
    number: normalizeProjectNumber(row.number, String(row.id)),
    name: row.name,
    active: row.active === 1,
    createdAt: row.createdAt,
  }));
  
  console.log(`[PROJECTS] Mapeados ${mapped.length} projetos`);
  return mapped;
}

/**
 * Insere/atualiza lote de projetos no Supabase
 */
async function upsertProjectsBatch(supabase: any, projects: ProjectToSync[]): Promise<ProjectToSync[]> {
  console.log(`[PROJECTS] Inserindo batch de ${projects.length} projetos...`);
  
  const { data, error } = await supabase
    .from('projects')
    .upsert(
      projects.map((project) => ({
        project_id: project.projectId,
        number: project.number,
        name: project.name,
        active: project.active,
        source: project.source,
        sync_scope_key: project.syncScopeKey,
        last_synced_at: project.lastSyncedAt,
        updated_at: new Date().toISOString(),
      })),
      {
        onConflict: 'project_id',
        ignoreDuplicates: false,
      }
    )
    .select();

  if (error) {
    console.error(`[PROJECTS] Erro no upsert:`, error);
    throw new Error(`Supabase upsert error: ${error.message}`);
  }

  console.log(`[PROJECTS] Batch inserido com sucesso! ${projects.length} projetos`);
  return projects;
}

/**
 * Atualiza estado de sincronização
 */
async function updateSyncState(
  supabase: any,
  syncedAt: string,
  projectCount: number,
  logger: Logger
) {
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 horas

  const { error } = await supabase
    .from('integration_sync_states')
    .upsert(
      {
        resource_type: 'artia_project_catalog',
        scope_key: 'global',
        user_id: null,
        sync_status: 'ready',
        last_synced_at: syncedAt,
        expires_at: expiresAt,
        metadata: {
          projectCount,
          source: 'artia_mysql',
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'resource_type,scope_key',
      }
    );

  if (error) {
    logger.warn('Failed to update sync state', { error });
  } else {
    logger.info('Sync state updated', { expiresAt });
  }
}
