import { supabase } from './supabaseClient.js';

const PAGE_SIZE = 1000;
const INSERT_CHUNK_SIZE = 500;

export class UserProjectionRepository {
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

  async listProjectAccess(userId) {
    const { data, error } = await supabase
      .from('user_project_access_cache')
      .select('*')
      .eq('user_id', userId)
      .order('project_id', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((row) => ({
      userId: row.user_id,
      projectId: row.project_id,
      source: row.source,
      lastSyncedAt: row.last_synced_at
    }));
  }

  async replaceProjectAccess(userId, projectIds, { source = 'artia_mysql', syncedAt = new Date().toISOString() } = {}) {
    const { error: deleteError } = await supabase
      .from('user_project_access_cache')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw deleteError;
    }

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return [];
    }

    const rows = Array.from(new Set(projectIds.map((projectId) => String(projectId).trim()).filter(Boolean)))
      .map((projectId) => ({
        user_id: userId,
        project_id: projectId,
        source,
        last_synced_at: syncedAt,
        updated_at: syncedAt
      }));

    await this.insertInChunks('user_project_access_cache', rows);
    return this.listProjectAccess(userId);
  }

  async listEventProjections(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('user_event_projection')
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

  async listDayRollups(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('user_day_rollups')
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

  async listProjectDayRollups(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('user_project_day_rollups')
      .select('*')
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true })
      .order('project_number', { ascending: true, nullsFirst: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async listActivityDayRollups(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('user_activity_day_rollups')
      .select('*')
      .eq('user_id', userId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true })
      .order('activity_label', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async deleteDayProjection(userId, day) {
    const deletions = [
      supabase
        .from('user_event_projection')
        .delete()
        .eq('user_id', userId)
        .eq('day', day),
      supabase
        .from('user_day_rollups')
        .delete()
        .eq('user_id', userId)
        .eq('day', day),
      supabase
        .from('user_project_day_rollups')
        .delete()
        .eq('user_id', userId)
        .eq('day', day),
      supabase
        .from('user_activity_day_rollups')
        .delete()
        .eq('user_id', userId)
        .eq('day', day)
    ];

    const results = await Promise.all(deletions);
    const firstError = results.find((result) => result.error)?.error;

    if (firstError) {
      throw firstError;
    }
  }

  async replaceDayProjection(userId, day, {
    eventRows = [],
    dayRollup = null,
    projectRollups = [],
    activityRollups = []
  } = {}) {
    await this.deleteDayProjection(userId, day);

    if (Array.isArray(eventRows) && eventRows.length > 0) {
      await this.insertInChunks('user_event_projection', eventRows);
    }

    if (dayRollup) {
      const { error } = await supabase
        .from('user_day_rollups')
        .insert(dayRollup);

      if (error) {
        throw error;
      }
    }

    if (Array.isArray(projectRollups) && projectRollups.length > 0) {
      await this.insertInChunks('user_project_day_rollups', projectRollups);
    }

    if (Array.isArray(activityRollups) && activityRollups.length > 0) {
      await this.insertInChunks('user_activity_day_rollups', activityRollups);
    }
  }
}
