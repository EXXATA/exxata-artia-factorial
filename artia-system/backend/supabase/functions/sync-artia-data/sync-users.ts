/**
 * Sync Users - Sincroniza colaboradores do Factorial e Artia MySQL para Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Logger } from './utils/logger.ts';
import { processBatch } from './utils/batch-processor.ts';
import { handleError } from './utils/error-handler.ts';

interface FactorialEmployee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
}

interface ArtiaUser {
  id: string;
  email: string;
  name: string;
}

interface UserToSync {
  email: string;
  name: string;
  artiaUserId: string | null;
  factorialEmployeeId: string | null;
}

function normalizeEmail(email: string | null | undefined): string {
  return String(email || '').trim().toLowerCase();
}

export async function syncUsers(
  supabaseUrl: string,
  supabaseKey: string,
  factorialApiKey: string,
  artiaDbConfig: any,
  logger: Logger
) {
  const startTime = Date.now();
  logger.info('Starting user synchronization');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar employees do Factorial
    logger.info('Fetching Factorial employees');
    const factorialEmployees = await fetchFactorialEmployees(factorialApiKey);
    logger.info(`Found ${factorialEmployees.length} Factorial employees`);

    // 2. Buscar usuários do Artia MySQL
    logger.info('Fetching Artia users');
    const artiaUsers = await fetchArtiaUsers(artiaDbConfig);
    logger.info(`Found ${artiaUsers.length} Artia users`);

    // 3. Fazer matching por email e preparar dados
    const usersToSync = mergeUsers(factorialEmployees, artiaUsers, logger);
    logger.info(`Prepared ${usersToSync.length} users for sync`);

    // 4. Sincronizar em lotes
    const result = await processBatch(
      usersToSync,
      async (batch) => {
        return await upsertUsersBatch(supabase, batch);
      },
      {
        batchSize: 50,
        parallel: false,
        retryAttempts: 3,
      }
    );

    const duration = Date.now() - startTime;

    logger.metrics('User synchronization completed', {
      total: result.total,
      inserted: result.successCount,
      failed: result.failureCount,
      duration_ms: duration,
    });

    if (result.failed.length > 0) {
      logger.warn(`${result.failed.length} users failed to sync`, {
        failures: result.failed.slice(0, 10), // Log apenas primeiros 10
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
    throw handleError(error, 'sync-users', logger);
  }
}

/**
 * Busca employees do Factorial via API
 */
async function fetchFactorialEmployees(apiKey: string): Promise<FactorialEmployee[]> {
  console.log('[USERS] Buscando employees do Factorial com paginação oficial...');

  const allEmployees: any[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(`https://api.factorialhr.com/api/2026-01-01/resources/employees/employees?page=${page}`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Factorial API error: ${response.status} - ${await response.text()}`);
    }

    const payload = await response.json();
    const employees = Array.isArray(payload?.data) ? payload.data : [];
    const meta = payload?.meta || {};

    allEmployees.push(...employees);
    console.log(`[USERS] Página ${page}: ${employees.length} employees (total: ${allEmployees.length})`);

    hasNextPage = Boolean(meta.has_next_page);
    page += 1;
  }

  const activeEmployees = allEmployees.filter((emp: any) => {
    if (typeof emp.active === 'boolean') {
      return emp.active;
    }
    return !emp.terminated_on;
  });

  console.log(`[USERS] Factorial retornou ${allEmployees.length} employees no total (${activeEmployees.length} ativos)`);

  return activeEmployees
    .filter((emp: any) => normalizeEmail(emp.email || emp.login_email))
    .map((emp: any) => ({
      id: String(emp.id),
      email: emp.email || emp.login_email,
      firstName: emp.first_name,
      lastName: emp.last_name,
      fullName: emp.full_name || `${emp.first_name} ${emp.last_name}`.trim(),
      isActive: true,
    }));
}

/**
 * Busca usuários do Artia MySQL direto
 */
async function fetchArtiaUsers(dbConfig: any): Promise<ArtiaUser[]> {
  try {
    const { executeQuery } = await import('./utils/mysql-client.ts');
    
    const query = `
      SELECT 
        id,
        email,
        name
      FROM organization_9115_organization_users_v2 
      WHERE organization_user_state = 'Ativo'
        AND email IS NOT NULL
        AND email <> ''
      ORDER BY name
    `;

    const rows = await executeQuery<any>(query);
    
    return rows.map((row) => ({
      id: String(row.id),
      email: row.email,
      name: row.name,
    }));
  } catch (error) {
    console.error('Error fetching Artia users from MySQL:', error);
    return [];
  }
}

/**
 * Faz matching entre Factorial e Artia por email
 */
function mergeUsers(
  factorialEmployees: FactorialEmployee[],
  artiaUsers: ArtiaUser[],
  logger: Logger
): UserToSync[] {
  console.log(`[USERS] Fazendo merge: ${factorialEmployees.length} Factorial + ${artiaUsers.length} Artia`);
  const artiaByEmail = new Map(artiaUsers.map((u) => [normalizeEmail(u.email), u]));
  const factorialByEmail = new Map(factorialEmployees.map((u) => [normalizeEmail(u.email), u]));
  const allEmails = new Set([...artiaByEmail.keys(), ...factorialByEmail.keys()]);

  const merged = Array.from(allEmails)
    .filter((email) => email)
    .map((email) => {
      const artiaUser = artiaByEmail.get(email);
      const factorialUser = factorialByEmail.get(email);

      return {
        email: factorialUser?.email || artiaUser?.email || email,
        name: artiaUser?.name || factorialUser?.fullName || email,
        artiaUserId: artiaUser?.id || null,
        factorialEmployeeId: factorialUser?.id || null,
      };
    });
  
  console.log(`[USERS] Merge resultou em ${merged.length} usuários`);
  return merged;
}

/**
 * Insere/atualiza lote de usuários no Supabase
 */
async function upsertUsersBatch(supabase: any, users: UserToSync[]): Promise<UserToSync[]> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      users.map((user) => ({
        email: user.email,
        name: user.name,
        artia_user_id: user.artiaUserId,
        factorial_employee_id: user.factorialEmployeeId,
        updated_at: new Date().toISOString(),
      })),
      {
        onConflict: 'email',
        ignoreDuplicates: false,
      }
    )
    .select();

  if (error) {
    throw error;
  }

  return users;
}
