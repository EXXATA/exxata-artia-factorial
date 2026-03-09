import { supabase } from './supabaseClient.js';

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export class IntegrationSnapshotRepository {
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

    await supabase
      .from('activities')
      .delete()
      .eq('source', source);

    await supabase
      .from('projects')
      .delete()
      .eq('source', source);

    if (!Array.isArray(projects) || projects.length === 0) {
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

    const { error: projectError } = await supabase
      .from('projects')
      .insert(projectRows);

    if (projectError) {
      throw projectError;
    }

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
      const { error: activitiesError } = await supabase
        .from('activities')
        .insert(activityRows);

      if (activitiesError) {
        throw activitiesError;
      }
    }

    return this.listProjectCatalog({ source, scopeKey });
  }

  async listProjectCatalog({ searchTerm = '', source = 'artia_mysql', scopeKey = 'global' } = {}) {
    let projectsQuery = supabase
      .from('projects')
      .select('*')
      .eq('source', source)
      .eq('sync_scope_key', scopeKey)
      .order('number', { ascending: true });

    if (searchTerm) {
      projectsQuery = projectsQuery.or(`number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
    }

    const { data: projectRows, error: projectError } = await projectsQuery;
    if (projectError) {
      throw projectError;
    }

    if (!projectRows?.length) {
      return [];
    }

    const projectIds = projectRows.map((project) => project.project_id);
    const { data: activityRows, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('source', source)
      .eq('sync_scope_key', scopeKey)
      .in('project_id', projectIds)
      .order('label', { ascending: true });

    if (activityError) {
      throw activityError;
    }

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
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('project_id', projectId)
      .eq('source', source)
      .eq('sync_scope_key', scopeKey)
      .order('label', { ascending: true });

    if (error) {
      throw error;
    }

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

    return this.upsertFactorialDailyHours(userId, employeeId, hoursByDay, syncedAt);
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

    return this.upsertArtiaDailyHours(userId, artiaUserId, hoursByDay, sourceTable, syncedAt);
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
}
