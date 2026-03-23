import { normalizeText, roundHours, toIsoDay } from './shared.js';
import { buildProjectDisplayLabel } from './projectContext.js';

export function resolveVisualEnd(entry) {
  if (entry?.end) {
    return {
      end: entry.end,
      endEstimated: false,
      isRenderableInCalendar: Boolean(entry.start)
    };
  }

  if (!entry?.start || !Number.isFinite(Number(entry?.minutes)) || Number(entry.minutes) <= 0) {
    return {
      end: null,
      endEstimated: false,
      isRenderableInCalendar: false
    };
  }

  const startDate = new Date(entry.start);
  if (Number.isNaN(startDate.getTime())) {
    return {
      end: null,
      endEstimated: false,
      isRenderableInCalendar: false
    };
  }

  const resolvedEnd = new Date(startDate.getTime() + (Number(entry.minutes) * 60000)).toISOString();
  return {
    end: resolvedEnd,
    endEstimated: true,
    isRenderableInCalendar: true
  };
}

export function matchesProjectFilter(projectFilter, payload) {
  if (!projectFilter) {
    return true;
  }

  const normalizedFilter = normalizeText(projectFilter);
  return [
    payload.projectKey,
    payload.projectId,
    payload.projectNumber,
    payload.projectName,
    payload.projectLabel,
    payload.projectDisplayLabel,
    payload.project
  ]
    .filter(Boolean)
    .some((value) => {
      const normalizedValue = normalizeText(value);
      return normalizedValue === normalizedFilter || normalizedValue.includes(normalizedFilter);
    });
}

export function matchesActivityFilter(activityFilter, activityId, activityLabel) {
  if (!activityFilter) {
    return true;
  }

  const normalizedFilter = normalizeText(activityFilter);
  return [activityId, activityLabel]
    .filter(Boolean)
    .some((value) => {
      const normalizedValue = normalizeText(value);
      return normalizedValue === normalizedFilter || normalizedValue.includes(normalizedFilter);
    });
}

export function serializeSystemEvent(event, projectDescriptor) {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const minutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  const projectDisplayLabel = buildProjectDisplayLabel(projectDescriptor, event.project);

  return {
    id: event.id,
    day: event.day,
    start: event.start,
    end: event.end,
    minutes,
    hours: roundHours(minutes / 60),
    project: event.project,
    projectKey: projectDescriptor.key,
    projectId: projectDescriptor.id,
    projectNumber: projectDescriptor.number,
    projectName: projectDescriptor.name,
    projectLabel: projectDisplayLabel,
    projectDisplayLabel,
    activityId: event.activityId,
    activityLabel: event.activityLabel,
    notes: event.notes || '',
    artiaLaunched: Boolean(event.artiaLaunched),
    artiaSyncStatus: event.artiaSyncStatus,
    artiaSyncLabel: event.artiaSyncLabel,
    artiaRemoteEntryId: event.artiaRemoteEntryId,
    artiaRemoteHours: event.artiaRemoteHours || 0,
    artiaRemoteProject: event.artiaRemoteProject || null,
    artiaRemoteActivity: event.artiaRemoteActivity || null,
    artiaRemoteStart: event.artiaRemoteStart || null,
    artiaRemoteEnd: event.artiaRemoteEnd || null,
    artiaSourceAvailable: Boolean(event.artiaSourceAvailable),
    artiaSourceTable: event.artiaSourceTable || null,
    artiaSyncReason: event.artiaSyncReason || null
  };
}

export function serializeArtiaEntry(entry, projectDescriptor) {
  const visualEnd = resolveVisualEnd(entry);
  const projectDisplayLabel = buildProjectDisplayLabel(projectDescriptor, entry.project);

  return {
    id: entry.id,
    day: entry.date,
    start: entry.start,
    end: visualEnd.end,
    endEstimated: visualEnd.endEstimated,
    isRenderableInCalendar: visualEnd.isRenderableInCalendar,
    minutes: entry.minutes,
    hours: roundHours(entry.hours),
    project: entry.project,
    projectKey: projectDescriptor.key,
    projectId: projectDescriptor.id,
    projectNumber: projectDescriptor.number,
    projectName: projectDescriptor.name,
    projectLabel: projectDisplayLabel,
    projectDisplayLabel,
    activity: entry.activity,
    activityLabel: entry.activity,
    activityId: entry.activityId,
    notes: entry.notes || '',
    status: entry.status || null,
    sourceTable: entry.sourceTable || null
  };
}

export function groupByDay(items, dayField) {
  return items.reduce((accumulator, item) => {
    const day = item[dayField];
    if (!day) {
      return accumulator;
    }

    if (!accumulator[day]) {
      accumulator[day] = [];
    }

    accumulator[day].push(item);
    return accumulator;
  }, {});
}

export function normalizeEventProjectionRow(row) {
  return {
    id: row.event_id,
    day: toIsoDay(row.day),
    start: row.start_time,
    end: row.end_time,
    project: row.project,
    projectKey: row.project_key,
    projectId: row.project_id,
    projectNumber: row.project_number,
    projectName: row.project_name,
    projectLabel: row.project_label,
    projectDisplayLabel: row.project_display_label,
    activityId: row.activity_id,
    activityLabel: row.activity_label,
    notes: row.notes || '',
    artiaLaunched: Boolean(row.artia_launched),
    artiaSyncStatus: row.sync_status,
    artiaSyncLabel: row.sync_label,
    artiaRemoteEntryId: row.remote_entry_id,
    artiaRemoteProject: row.remote_project,
    artiaRemoteActivity: row.remote_activity,
    artiaRemoteHours: Number(row.remote_hours || 0),
    artiaRemoteStart: row.remote_start,
    artiaRemoteEnd: row.remote_end,
    hasProjectAccess: Boolean(row.has_project_access),
    artiaSourceAvailable: Boolean(row.artia_source_available),
    artiaSourceTable: row.artia_source_table || null,
    artiaSyncReason: row.artia_sync_reason || null,
    minutes: Math.max(0, Math.round((new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 60000)),
    hours: roundHours((new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000)
  };
}

export function normalizeDayRollupRow(row) {
  return {
    date: toIsoDay(row.day),
    factorialHours: Number(row.factorial_hours || 0),
    systemHours: Number(row.system_hours || 0),
    syncedSystemHours: Number(row.synced_hours || 0),
    pendingSystemHours: Number(row.pending_hours || 0),
    manualSystemHours: Number(row.manual_hours || 0),
    artiaHours: Number(row.artia_hours || 0),
    artiaEntryCount: Number(row.artia_entry_count || 0),
    remoteOnlyArtiaEntries: Array.isArray(row.remote_only_entries_json) ? row.remote_only_entries_json : [],
    artiaEntries: Array.isArray(row.artia_entries_json) ? row.artia_entries_json : [],
    artiaSourceAvailable: Boolean(row.artia_source_available),
    artiaSourceTable: row.artia_source_table || null,
    artiaReadReason: row.artia_read_reason || null,
    remoteOnlyCount: Number(row.remote_only_count || 0),
    lastComputedAt: row.last_computed_at
  };
}

export function normalizeProjectDayRollupRow(row) {
  return {
    day: toIsoDay(row.day),
    projectKey: row.project_key,
    projectId: row.project_id,
    projectNumber: row.project_number,
    projectName: row.project_name,
    projectLabel: row.project_label,
    systemHours: Number(row.system_hours || 0),
    syncedSystemHours: Number(row.synced_hours || 0),
    pendingSystemHours: Number(row.pending_hours || 0),
    manualSystemHours: Number(row.manual_hours || 0),
    systemEventCount: Number(row.system_event_count || 0),
    artiaHours: Number(row.artia_hours || 0),
    artiaEntryCount: Number(row.artia_entry_count || 0),
    remoteOnlyArtiaHours: Number(row.remote_only_hours || 0),
    remoteOnlyArtiaEntryCount: Number(row.remote_only_entry_count || 0)
  };
}

export function normalizeActivityDayRollupRow(row) {
  return {
    day: toIsoDay(row.day),
    key: row.activity_key,
    projectKey: row.project_key,
    projectId: row.project_id,
    projectNumber: row.project_number,
    projectName: row.project_name,
    projectLabel: row.project_label,
    activityId: row.activity_id,
    activityLabel: row.activity_label,
    systemHours: Number(row.system_hours || 0),
    syncedSystemHours: Number(row.synced_hours || 0),
    pendingSystemHours: Number(row.pending_hours || 0),
    manualSystemHours: Number(row.manual_hours || 0),
    systemEventCount: Number(row.system_event_count || 0),
    artiaHours: Number(row.artia_hours || 0),
    artiaEntryCount: Number(row.artia_entry_count || 0),
    remoteOnlyArtiaHours: Number(row.remote_only_hours || 0),
    remoteOnlyArtiaEntryCount: Number(row.remote_only_entry_count || 0)
  };
}
