import { supabase } from './supabaseClient.js';

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function isFreshTimestamp(value, ttlHours) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return (timestamp + (ttlHours * 60 * 60 * 1000)) > Date.now();
}

const PAGE_SIZE = 1000;
const INSERT_CHUNK_SIZE = 500;
const PROJECT_ID_FILTER_CHUNK_SIZE = 200;

export class IntegrationSnapshotRepository {
  async fetchAllPages(buildQuery, pageSize = PAGE_SIZE) {
    const rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await buildQuery(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      const page = data || [];
      rows.push(...page);

      if (page.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return rows;
  }

  async insertInChunks(tableName, rows, chunkSize = INSERT_CHUNK_SIZE) {
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const { error } = await supabase
        .from(tableName)
        .insert(chunk);

      if (error) {
        throw error;
      }
    }
  }

  async upsertInChunks(tableName, rows, { onConflict, chunkSize = INSERT_CHUNK_SIZE }) {
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const { error } = await supabase
        .from(tableName)
        .upsert(chunk, { onConflict });

      if (error) {
        throw error;
      }
    }
  }

  async deleteByIdsInChunks(tableName, idColumn, ids, filters = {}, chunkSize = INSERT_CHUNK_SIZE) {
    for (let index = 0; index < ids.length; index += chunkSize) {
      const idsChunk = ids.slice(index, index + chunkSize);
      let query = supabase
        .from(tableName)
        .delete()
        .in(idColumn, idsChunk);

      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });

      const { error } = await query;

      if (error) {
        throw error;
      }
    }
  }

  async fetchActivitiesByProjectIds(projectIds, { source = 'artia_mysql', scopeKey = 'global' } = {}) {
    const rows = [];

    for (let index = 0; index < projectIds.length; index += PROJECT_ID_FILTER_CHUNK_SIZE) {
      const projectIdsChunk = projectIds.slice(index, index + PROJECT_ID_FILTER_CHUNK_SIZE);
      const chunkRows = await this.fetchAllPages((from, to) => (
        supabase
          .from('activities')
          .select('*')
          .eq('source', source)
          .eq('sync_scope_key', scopeKey)
          .in('project_id', projectIdsChunk)
          .order('label', { ascending: true })
          .range(from, to)
      ));

      rows.push(...chunkRows);
    }

    return rows;
  }

  async getSyncState(resourceType, scopeKey) {
    const { data, error } = await supabase
      .from('integration_sync_states')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('scope_key', scopeKey)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async upsertSyncState({
    resourceType,
    scopeKey,
    userId = null,
    syncStatus = 'ready',
    lastSyncedAt = null,
    expiresAt = null,
    syncStartedAt = null,
    errorMessage = null,
    metadata = {}
  }) {
    const payload = {
      resource_type: resourceType,
      scope_key: scopeKey,
      user_id: userId,
      sync_status: syncStatus,
      last_synced_at: lastSyncedAt,
      expires_at: expiresAt,
      sync_started_at: syncStartedAt,
      error_message: errorMessage,
      metadata,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('integration_sync_states')
      .upsert(payload, { onConflict: 'resource_type,scope_key' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  isFresh(syncState) {
    if (!syncState?.expires_at) {
      return false;
    }

    return new Date(syncState.expires_at).getTime() > Date.now();
  }

  async replaceProjectCatalog(projects, options = {}) {
    const source = options.source || 'artia_mysql';
    const scopeKey = options.scopeKey || 'global';
    const syncedAt = options.syncedAt || new Date().toISOString();
    const existingProjectRows = await this.fetchAllPages((from, to) => (
      supabase
        .from('projects')
        .select('project_id')
        .eq('source', source)
        .eq('sync_scope_key', scopeKey)
        .range(from, to)
    ));
    const existingActivityRows = await this.fetchAllPages((from, to) => (
      supabase
        .from('activities')
        .select('activity_id')
        .eq('source', source)
        .eq('sync_scope_key', scopeKey)
        .range(from, to)
    ));

    if (!Array.isArray(projects) || projects.length === 0) {
      const existingProjectIds = existingProjectRows.map((row) => row.project_id);
      const existingActivityIds = existingActivityRows.map((row) => row.activity_id);

      if (existingActivityIds.length > 0) {
        await this.deleteByIdsInChunks('activities', 'activity_id', existingActivityIds, {
          source,
          sync_scope_key: scopeKey
        });
      }

      if (existingProjectIds.length > 0) {
        await this.deleteByIdsInChunks('projects', 'project_id', existingProjectIds, {
          source,
          sync_scope_key: scopeKey
        });
      }

      return [];
    }

    const projectRows = projects.map((project) => ({
      project_id: project.id,
      number: project.number,
      name: project.name,
      active: project.active !== false,
      source,
      sync_scope_key: scopeKey,
      last_synced_at: syncedAt,
      updated_at: syncedAt
    }));

    await this.upsertInChunks('projects', projectRows, { onConflict: 'project_id' });

    const activityRows = projects.flatMap((project) =>
      (project.activities || []).map((activity) => ({
        activity_id: activity.id,
        project_id: project.id,
        label: activity.label,
        artia_id: activity.artiaId,
        active: activity.active !== false,
        source,
        sync_scope_key: scopeKey,
        last_synced_at: syncedAt,
        updated_at: syncedAt
      }))
    );

    if (activityRows.length > 0) {
      await this.upsertInChunks('activities', activityRows, { onConflict: 'activity_id' });
    }

    const currentProjectIds = new Set(projectRows.map((row) => String(row.project_id)));
    const currentActivityIds = new Set(activityRows.map((row) => String(row.activity_id)));
    const staleProjectIds = existingProjectRows
      .map((row) => String(row.project_id))
      .filter((projectId) => !currentProjectIds.has(projectId));
    const staleActivityIds = existingActivityRows
      .map((row) => String(row.activity_id))
      .filter((activityId) => !currentActivityIds.has(activityId));

    if (staleActivityIds.length > 0) {
      await this.deleteByIdsInChunks('activities', 'activity_id', staleActivityIds, {
        source,
        sync_scope_key: scopeKey
      });
    }

    if (staleProjectIds.length > 0) {
      await this.deleteByIdsInChunks('projects', 'project_id', staleProjectIds, {
        source,
        sync_scope_key: scopeKey
      });
    }

    return this.listProjectCatalog({ source, scopeKey });
  }

  async listProjectCatalog({ searchTerm = '', source = 'artia_mysql', scopeKey = 'global' } = {}) {
    const projectRows = await this.fetchAllPages((from, to) => {
      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .eq('source', source)
        .eq('sync_scope_key', scopeKey)
        .order('number', { ascending: true })
        .range(from, to);

      if (searchTerm) {
        projectsQuery = projectsQuery.or(`number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
      }

      return projectsQuery;
    });

    if (!projectRows?.length) {
      return [];
    }

    const projectIds = projectRows.map((project) => project.project_id);
    const activityRows = await this.fetchActivitiesByProjectIds(projectIds, { source, scopeKey });

    const activitiesByProject = (activityRows || []).reduce((accumulator, activity) => {
      if (!accumulator[activity.project_id]) {
        accumulator[activity.project_id] = [];
      }

      accumulator[activity.project_id].push({
        id: activity.activity_id,
        projectId: activity.project_id,
        label: activity.label,
        artiaId: activity.artia_id,
        active: activity.active
      });

      return accumulator;
    }, {});

    return projectRows.map((project) => ({
      id: project.project_id,
      number: project.number,
      name: project.name,
      active: project.active,
      lastSyncedAt: project.last_synced_at,
      activities: activitiesByProject[project.project_id] || []
    }));
  }

  async getProjectActivities(projectId, { source = 'artia_mysql', scopeKey = 'global' } = {}) {
    const data = await this.fetchAllPages((from, to) => (
      supabase
        .from('activities')
        .select('*')
        .eq('project_id', projectId)
        .eq('source', source)
        .eq('sync_scope_key', scopeKey)
        .order('label', { ascending: true })
        .range(from, to)
    ));

    return (data || []).map((activity) => ({
      id: activity.activity_id,
      projectId: activity.project_id,
      label: activity.label,
      artiaId: activity.artia_id,
      active: activity.active
    }));
  }

  async getFactorialDailyHours(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('factorial_daily_hours_cache')
      .select('*')
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async upsertFactorialDailyHours(userId, employeeId, hoursByDay, syncedAt = new Date().toISOString()) {
    const rows = Object.entries(hoursByDay || {}).map(([day, workedHours]) => ({
      user_id: userId,
      employee_id: employeeId,
      day,
      worked_hours: Number(workedHours.toFixed ? workedHours.toFixed(2) : workedHours),
      source_synced_at: syncedAt,
      updated_at: syncedAt
    }));

    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('factorial_daily_hours_cache')
      .upsert(rows, { onConflict: 'user_id,day' })
      .select();

    if (error) {
      throw error;
    }

    return data || [];
  }

  async replaceFactorialDailyHours(userId, employeeId, startDate, endDate, hoursByDay, syncedAt = new Date().toISOString()) {
    const { error: deleteError } = await supabase
      .from('factorial_daily_hours_cache')
      .delete()
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate);

    if (deleteError) {
      throw deleteError;
    }

    const rows = [];
    let cursor = startDate;

    while (cursor <= endDate) {
      rows.push({
        user_id: userId,
        employee_id: employeeId,
        day: cursor,
        worked_hours: Number(Number(hoursByDay?.[cursor] || 0).toFixed(2)),
        source_synced_at: syncedAt,
        updated_at: syncedAt
      });
      cursor = addDays(cursor, 1);
    }

    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('factorial_daily_hours_cache')
      .insert(rows)
      .select();

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getArtiaDailyHours(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('artia_daily_hours_cache')
      .select('*')
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async replaceArtiaDailyHours(userId, artiaUserId, startDate, endDate, hoursByDay, sourceTable, syncedAt = new Date().toISOString()) {
    const { error: deleteError } = await supabase
      .from('artia_daily_hours_cache')
      .delete()
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate);

    if (deleteError) {
      throw deleteError;
    }

    const rows = [];
    let cursor = startDate;

    while (cursor <= endDate) {
      const value = hoursByDay?.[cursor] || {};
      rows.push({
        user_id: userId,
        artia_user_id: artiaUserId,
        day: cursor,
        worked_hours: Number(Number(value.workedHours || 0).toFixed(2)),
        entry_count: Number(value.entryCount || 0),
        source_table: sourceTable,
        source_synced_at: syncedAt,
        updated_at: syncedAt
      });
      cursor = addDays(cursor, 1);
    }

    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('artia_daily_hours_cache')
      .insert(rows)
      .select();

    if (error) {
      throw error;
    }

    return data || [];
  }

  async upsertArtiaDailyHours(userId, artiaUserId, hoursByDay, sourceTable, syncedAt = new Date().toISOString()) {
    const rows = Object.entries(hoursByDay || {}).map(([day, value]) => ({
      user_id: userId,
      artia_user_id: artiaUserId,
      day,
      worked_hours: Number((value.workedHours || 0).toFixed(2)),
      entry_count: value.entryCount || 0,
      source_table: sourceTable,
      source_synced_at: syncedAt,
      updated_at: syncedAt
    }));

    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('artia_daily_hours_cache')
      .upsert(rows, { onConflict: 'user_id,day' })
      .select();

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getArtiaTimeEntries(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('artia_time_entries_cache')
      .select('*')
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async replaceArtiaTimeEntries(userId, artiaUserId, startDate, endDate, entries, sourceTable, syncedAt = new Date().toISOString()) {
    await supabase
      .from('artia_time_entries_cache')
      .delete()
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate);

    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    const rows = entries.map((entry) => ({
      user_id: userId,
      artia_user_id: artiaUserId,
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
      source_table: sourceTable,
      source_status: entry.status || null,
      source_synced_at: syncedAt,
      updated_at: syncedAt
    }));

    const { data, error } = await supabase
      .from('artia_time_entries_cache')
      .insert(rows)
      .select();

    if (error) {
      throw error;
    }

    return data || [];
  }

  buildScopeKey(resourceType, userId, startDate, endDate) {
    return `${resourceType}:${userId}:${startDate}:${endDate}`;
  }

  buildExpiry(dateString, ttlHours) {
    return new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  }

  normalizeFactorialRows(rows) {
    return Object.fromEntries((rows || []).map((row) => [row.day, Number(row.worked_hours)]));
  }

  normalizeArtiaDailyRows(rows) {
    return Object.fromEntries((rows || []).map((row) => [row.day, {
      workedHours: Number(row.worked_hours),
      entryCount: Number(row.entry_count || 0),
      sourceTable: row.source_table || null
    }]));
  }

  normalizeArtiaEntryRows(rows) {
    return (rows || []).map((row) => ({
      id: row.entry_id,
      date: row.day,
      start: row.start_time,
      end: row.end_time,
      minutes: row.worked_minutes,
      hours: Number(row.worked_hours),
      project: row.project,
      projectId: row.project_id,
      activity: row.activity_label,
      activityId: row.activity_id,
      notes: row.notes,
      userId: row.artia_user_id,
      userEmail: '',
      status: row.source_status,
      sourceTable: row.source_table
    }));
  }

  buildArtiaDailyPayload(entries) {
    return (entries || []).reduce((accumulator, entry) => {
      if (!accumulator[entry.date]) {
        accumulator[entry.date] = {
          workedHours: 0,
          entryCount: 0
        };
      }

      accumulator[entry.date].workedHours += entry.hours || 0;
      accumulator[entry.date].entryCount += 1;
      return accumulator;
    }, {});
  }

  listMissingDays(startDate, endDate, rows) {
    const existing = new Set((rows || []).map((row) => row.day));
    const missingDays = [];
    let cursor = startDate;

    while (cursor <= endDate) {
      if (!existing.has(cursor)) {
        missingDays.push(cursor);
      }
      cursor = addDays(cursor, 1);
    }

    return missingDays;
  }

  listStaleDays(startDate, endDate, rows, ttlHours, timestampColumn = 'source_synced_at') {
    const rowByDay = new Map((rows || []).map((row) => [row.day, row]));
    const staleDays = [];
    let cursor = startDate;

    while (cursor <= endDate) {
      const row = rowByDay.get(cursor);

      if (!row || !isFreshTimestamp(row[timestampColumn], ttlHours)) {
        staleDays.push(cursor);
      }

      cursor = addDays(cursor, 1);
    }

    return staleDays;
  }
}
