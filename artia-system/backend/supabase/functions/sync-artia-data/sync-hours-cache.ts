/**
 * Sync Hours Cache - Sincroniza cache de horas do Factorial e Artia
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Logger } from './utils/logger.ts';
import { processIndividually } from './utils/batch-processor.ts';
import { handleError } from './utils/error-handler.ts';

interface User {
  id: string;
  email: string;
  factorialEmployeeId: string | null;
  artiaUserId: string | null;
}

export async function syncHoursCache(
  supabaseUrl: string,
  supabaseKey: string,
  factorialApiKey: string,
  logger: Logger,
  options: {
    syncFactorial?: boolean;
    syncArtia?: boolean;
    daysToSync?: number;
  } = {}
) {
  const {
    syncFactorial = true,
    syncArtia = true,
    daysToSync = 7, // Apenas últimos 7 dias na sync diária
  } = options;

  const startTime = Date.now();
  logger.info('Starting hours cache synchronization', { syncFactorial, syncArtia, daysToSync });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar usuários ativos
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, factorial_employee_id, artia_user_id');

    if (usersError) {
      throw usersError;
    }

    logger.info(`Found ${users?.length || 0} users to sync`);

    const results = {
      factorial: { synced: 0, failed: 0 },
      artia: { synced: 0, failed: 0 },
    };

    // 2. Sincronizar cache do Factorial
    if (syncFactorial) {
      const factorialUsers = users?.filter((u: User) => u.factorialEmployeeId) || [];
      logger.info(`Syncing Factorial cache for ${factorialUsers.length} users`);

      const factorialResult = await processIndividually(
        factorialUsers,
        async (user: User) => {
          return await syncFactorialUserHours(
            supabase,
            user,
            factorialApiKey,
            daysToSync,
            logger
          );
        },
        {
          continueOnError: true,
          retryAttempts: 2,
        }
      );

      results.factorial.synced = factorialResult.successCount;
      results.factorial.failed = factorialResult.failureCount;

      logger.info('Factorial cache sync completed', results.factorial);
    }

    // 3. Sincronizar cache do Artia
    if (syncArtia) {
      const artiaUsers = users?.filter((u: User) => u.artiaUserId) || [];
      logger.info(`Syncing Artia cache for ${artiaUsers.length} users`);

      const artiaResult = await processIndividually(
        artiaUsers,
        async (user: User) => {
          return await syncArtiaUserHours(supabase, user, daysToSync, logger);
        },
        {
          continueOnError: true,
          retryAttempts: 2,
        }
      );

      results.artia.synced = artiaResult.successCount;
      results.artia.failed = artiaResult.failureCount;

      logger.info('Artia cache sync completed', results.artia);
    }

    const duration = Date.now() - startTime;

    logger.metrics('Hours cache synchronization completed', {
      factorial_synced: results.factorial.synced,
      factorial_failed: results.factorial.failed,
      artia_synced: results.artia.synced,
      artia_failed: results.artia.failed,
      duration_ms: duration,
    });

    return {
      success: true,
      factorial: results.factorial,
      artia: results.artia,
      duration_ms: duration,
    };
  } catch (error) {
    throw handleError(error, 'sync-hours-cache', logger);
  }
}

/**
 * Sincroniza horas do Factorial para um usuário
 */
async function syncFactorialUserHours(
  supabase: any,
  user: User,
  factorialApiKey: string,
  daysToSync: number,
  logger: Logger
): Promise<User> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToSync);

  // Buscar shifts do Factorial
  const shifts = await fetchFactorialShifts(
    user.factorialEmployeeId!,
    startDate,
    endDate,
    factorialApiKey
  );

  if (shifts.length === 0) {
    return user;
  }

  // Agregar por dia
  const hoursByDay = aggregateShiftsByDay(shifts);

  // Upsert no cache
  const records = Object.entries(hoursByDay).map(([day, hours]) => ({
    user_id: user.id,
    employee_id: user.factorialEmployeeId,
    day,
    worked_hours: hours,
    source_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('factorial_daily_hours_cache')
    .upsert(records, {
      onConflict: 'user_id,day',
      ignoreDuplicates: false,
    });

  if (error) {
    throw error;
  }

  // Atualizar sync state
  await updateFactorialSyncState(supabase, user.id, startDate, endDate, Object.keys(hoursByDay).length);

  return user;
}

/**
 * Sincroniza horas do Artia para um usuário
 */
async function syncArtiaUserHours(
  supabase: any,
  user: User,
  daysToSync: number,
  logger: Logger
): Promise<User> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - daysToSync * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Buscar entries do Artia via backend API
  const backendUrl = Deno.env.get('BACKEND_API_URL');
  if (!backendUrl) {
    logger.warn('BACKEND_API_URL not configured, skipping Artia sync');
    return user;
  }

  const response = await fetch(
    `${backendUrl}/api/v1/artia-hours/entries?userId=${user.artiaUserId}&startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BACKEND_API_KEY')}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }

  const data = await response.json();
  const entries = data.entries || [];

  if (entries.length === 0) {
    return user;
  }

  // Inserir entries no cache
  const entryRecords = entries.map((entry: any) => ({
    user_id: user.id,
    artia_user_id: user.artiaUserId,
    entry_id: entry.id,
    day: entry.date,
    start_time: entry.start,
    end_time: entry.end,
    worked_minutes: entry.minutes,
    worked_hours: entry.hours,
    project: entry.project,
    project_id: entry.projectId,
    activity_label: entry.activity,
    activity_id: entry.activityId,
    notes: entry.notes || '',
    source_table: entry.sourceTable,
    source_status: entry.status,
    source_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error: entriesError } = await supabase
    .from('artia_time_entries_cache')
    .upsert(entryRecords, {
      onConflict: 'user_id,entry_id',
      ignoreDuplicates: false,
    });

  if (entriesError) {
    throw entriesError;
  }

  // Agregar por dia e inserir no daily cache
  const dailyHours = aggregateEntriesByDay(entries);
  const dailyRecords = Object.entries(dailyHours).map(([day, data]: [string, any]) => ({
    user_id: user.id,
    artia_user_id: user.artiaUserId,
    day,
    worked_hours: data.hours,
    entry_count: data.count,
    source_table: entries[0]?.sourceTable,
    source_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error: dailyError } = await supabase
    .from('artia_daily_hours_cache')
    .upsert(dailyRecords, {
      onConflict: 'user_id,day',
      ignoreDuplicates: false,
    });

  if (dailyError) {
    throw dailyError;
  }

  // Atualizar sync state
  await updateArtiaSyncState(supabase, user.id, startDate, endDate, entries.length);

  return user;
}

/**
 * Busca shifts do Factorial
 */
async function fetchFactorialShifts(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  apiKey: string
): Promise<any[]> {
  const response = await fetch(
    `https://api.factorialhr.com/api/2026-01-01/resources/attendance/shifts?employee_id=${employeeId}&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`,
    {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Factorial API error: ${response.status}`);
  }

  const data = await response.json();
  return data?.data || data || [];
}

/**
 * Agrega shifts por dia
 */
function aggregateShiftsByDay(shifts: any[]): Record<string, number> {
  const hoursByDay: Record<string, number> = {};

  for (const shift of shifts) {
    const day = shift.date || shift.reference_date;
    if (!day) continue;

    const hours = shift.minutes ? shift.minutes / 60 : 0;
    hoursByDay[day] = (hoursByDay[day] || 0) + hours;
  }

  return hoursByDay;
}

/**
 * Agrega entries por dia
 */
function aggregateEntriesByDay(entries: any[]): Record<string, { hours: number; count: number }> {
  const dailyData: Record<string, { hours: number; count: number }> = {};

  for (const entry of entries) {
    const day = entry.date;
    if (!day) continue;

    if (!dailyData[day]) {
      dailyData[day] = { hours: 0, count: 0 };
    }

    dailyData[day].hours += entry.hours || 0;
    dailyData[day].count += 1;
  }

  return dailyData;
}

/**
 * Atualiza sync state do Factorial
 */
async function updateFactorialSyncState(
  supabase: any,
  userId: string,
  startDate: Date,
  endDate: Date,
  daysCount: number
) {
  const scopeKey = `factorial_daily_hours:${userId}:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  await supabase.from('integration_sync_states').upsert(
    {
      resource_type: 'factorial_daily_hours',
      scope_key: scopeKey,
      user_id: userId,
      sync_status: 'ready',
      last_synced_at: new Date().toISOString(),
      expires_at: expiresAt,
      metadata: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: daysCount,
      },
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'resource_type,scope_key',
    }
  );
}

/**
 * Atualiza sync state do Artia
 */
async function updateArtiaSyncState(
  supabase: any,
  userId: string,
  startDate: string,
  endDate: string,
  entryCount: number
) {
  const scopeKey = `artia_time_entries:${userId}:${startDate}:${endDate}`;
  const expiresAt = new Date(Date.now() + 6 * 60 * 1000).toISOString(); // 6 min

  await supabase.from('integration_sync_states').upsert(
    {
      resource_type: 'artia_time_entries',
      scope_key: scopeKey,
      user_id: userId,
      sync_status: 'ready',
      last_synced_at: new Date().toISOString(),
      expires_at: expiresAt,
      metadata: {
        startDate,
        endDate,
        entryCount,
      },
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'resource_type,scope_key',
    }
  );
}
