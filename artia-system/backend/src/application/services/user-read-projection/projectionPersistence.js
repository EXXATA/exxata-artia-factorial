import { WorkedHoursComparison } from '../../../domain/value-objects/WorkedHoursComparison.js';
import {
  normalizeEventProjectionRow,
  serializeArtiaEntry,
  serializeSystemEvent
} from './eventSerialization.js';
import {
  resolveCatalogProjectDescriptor,
  resolveProjectDescriptor
} from './projectContext.js';
import { roundHours, toIsoDay } from './shared.js';
import { buildProjectAndActivitySummaries } from './summaryBuilder.js';

export function buildSourceTimestampByDay(days, factorialRows, artiaDailyRows, accessLastSyncedAt = null) {
  const sourceByDay = Object.fromEntries(days.map((day) => [day, 0]));

  (factorialRows || []).forEach((row) => {
    const day = toIsoDay(row.day);
    const timestamp = new Date(row.source_synced_at || 0).getTime();
    if (day && Number.isFinite(timestamp)) {
      sourceByDay[day] = Math.max(sourceByDay[day] || 0, timestamp);
    }
  });

  (artiaDailyRows || []).forEach((row) => {
    const day = toIsoDay(row.day);
    const timestamp = new Date(row.source_synced_at || 0).getTime();
    if (day && Number.isFinite(timestamp)) {
      sourceByDay[day] = Math.max(sourceByDay[day] || 0, timestamp);
    }
  });

  const accessTimestamp = accessLastSyncedAt ? new Date(accessLastSyncedAt).getTime() : 0;
  if (Number.isFinite(accessTimestamp) && accessTimestamp > 0) {
    days.forEach((day) => {
      sourceByDay[day] = Math.max(sourceByDay[day] || 0, accessTimestamp);
    });
  }

  return sourceByDay;
}

export function buildEventProjectionRows(userId, computedAt, decoratedEvents, projectContext) {
  const accessibleProjectIds = new Set(
    (projectContext.accessibleProjectIds || []).map((projectId) => String(projectId))
  );

  return decoratedEvents.map((event) => {
    const catalogDescriptor = resolveCatalogProjectDescriptor(projectContext, {
      systemProject: event.project,
      artiaProject: event.artiaRemoteProject
    });
    const projectDescriptor = catalogDescriptor || resolveProjectDescriptor(projectContext, {
      systemProject: event.project,
      artiaProject: event.artiaRemoteProject
    });
    const serialized = serializeSystemEvent(event, projectDescriptor);
    const resolvedProjectId = String(projectDescriptor.id || '').trim();
    const hasProjectAccess = resolvedProjectId ? accessibleProjectIds.has(resolvedProjectId) : false;

    return {
      user_id: userId,
      event_id: serialized.id,
      day: serialized.day,
      start_time: serialized.start,
      end_time: serialized.end,
      project: serialized.project,
      project_key: serialized.projectKey,
      project_id: serialized.projectId,
      project_number: serialized.projectNumber,
      project_name: serialized.projectName,
      project_label: serialized.projectLabel,
      project_display_label: serialized.projectDisplayLabel,
      activity_id: serialized.activityId,
      activity_label: serialized.activityLabel,
      notes: serialized.notes || '',
      artia_launched: serialized.artiaLaunched,
      sync_status: serialized.artiaSyncStatus,
      sync_label: serialized.artiaSyncLabel,
      remote_entry_id: serialized.artiaRemoteEntryId,
      remote_project: serialized.artiaRemoteProject,
      remote_activity: serialized.artiaRemoteActivity,
      remote_hours: roundHours(serialized.artiaRemoteHours),
      remote_start: serialized.artiaRemoteStart,
      remote_end: serialized.artiaRemoteEnd,
      has_project_access: hasProjectAccess,
      artia_source_available: serialized.artiaSourceAvailable,
      artia_source_table: serialized.artiaSourceTable,
      artia_sync_reason: serialized.artiaSyncReason,
      last_computed_at: computedAt,
      updated_at: computedAt
    };
  });
}

export function buildDayProjectionPayload(userId, day, computedAt, {
  decoratedEvents = [],
  artiaEntries = [],
  factorialHours = 0,
  artiaSource = null,
  artiaReason = null,
  projectContext
}) {
  const eventRows = buildEventProjectionRows(userId, computedAt, decoratedEvents, projectContext)
    .filter((row) => row.day === day);

  const normalizedEventRows = eventRows.map((row) => normalizeEventProjectionRow(row));
  const systemEvents = normalizedEventRows;
  const accessibleProjectIds = new Set(
    (projectContext.accessibleProjectIds || []).map((projectId) => String(projectId))
  );

  const serializedArtiaEntries = (artiaEntries || [])
    .map((entry) => {
      const catalogDescriptor = resolveCatalogProjectDescriptor(projectContext, {
        artiaProject: entry.project,
        artiaProjectId: entry.projectId
      });
      const projectDescriptor = catalogDescriptor || resolveProjectDescriptor(projectContext, {
        artiaProject: entry.project,
        artiaProjectId: entry.projectId
      });
      const serialized = serializeArtiaEntry(entry, projectDescriptor);
      const resolvedProjectId = String(projectDescriptor.id || entry.projectId || '').trim();

      return {
        ...serialized,
        hasProjectAccess: resolvedProjectId ? accessibleProjectIds.has(resolvedProjectId) : false
      };
    })
    .filter(Boolean);

  const matchedRemoteEntryIds = new Set(
    systemEvents
      .map((event) => event.artiaRemoteEntryId)
      .filter(Boolean)
  );
  const remoteOnlyEntries = serializedArtiaEntries.filter((entry) => !matchedRemoteEntryIds.has(entry.id));

  const comparison = new WorkedHoursComparison({
    date: day,
    factorialHours: Number(factorialHours || 0),
    artiaHours: serializedArtiaEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
    systemHours: systemEvents.reduce((sum, event) => sum + Number(event.hours || 0), 0),
    syncedSystemHours: systemEvents
      .filter((event) => event.artiaSyncStatus === 'synced')
      .reduce((sum, event) => sum + Number(event.hours || 0), 0),
    pendingSystemHours: systemEvents
      .filter((event) => event.artiaSyncStatus !== 'synced')
      .reduce((sum, event) => sum + Number(event.hours || 0), 0),
    manualSystemHours: systemEvents
      .filter((event) => event.artiaSyncStatus === 'manual')
      .reduce((sum, event) => sum + Number(event.hours || 0), 0),
    artiaEntryCount: serializedArtiaEntries.length
  }).toJSON();

  const summaries = buildProjectAndActivitySummaries({
    comparisons: [comparison],
    systemEvents,
    artiaEntries: serializedArtiaEntries,
    remoteOnlyEntryIds: new Set(remoteOnlyEntries.map((entry) => entry.id))
  });

  const dayRollup = {
    user_id: userId,
    day,
    factorial_hours: roundHours(comparison.factorialHours),
    system_hours: roundHours(comparison.systemHours),
    synced_hours: roundHours(comparison.syncedSystemHours),
    pending_hours: roundHours(comparison.pendingSystemHours),
    manual_hours: roundHours(comparison.manualSystemHours),
    artia_hours: roundHours(comparison.artiaHours),
    artia_entry_count: Number(comparison.artiaEntryCount || 0),
    remote_only_count: remoteOnlyEntries.length,
    remote_only_hours: roundHours(remoteOnlyEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0)),
    artia_source_available: Boolean(artiaSource),
    artia_source_table: artiaSource?.tableName || null,
    artia_read_reason: artiaReason || null,
    artia_entries_json: serializedArtiaEntries,
    remote_only_entries_json: remoteOnlyEntries,
    last_computed_at: computedAt,
    updated_at: computedAt
  };

  const projectRollups = summaries.projectSummaries.map((summary) => {
    const byDay = summary.byDay.find((item) => item.day === day) || {};
    return {
      user_id: userId,
      day,
      project_key: summary.projectKey,
      project_id: summary.projectId,
      project_number: summary.projectNumber,
      project_name: summary.projectName,
      project_label: summary.projectLabel,
      system_hours: roundHours(byDay.systemHours || 0),
      synced_hours: roundHours(byDay.syncedSystemHours || 0),
      pending_hours: roundHours(byDay.pendingSystemHours || 0),
      manual_hours: roundHours(byDay.manualSystemHours || 0),
      system_event_count: Number(systemEvents.filter((event) => event.projectKey === summary.projectKey).length),
      artia_hours: roundHours(byDay.artiaHours || 0),
      artia_entry_count: Number(byDay.artiaEntryCount || 0),
      remote_only_hours: roundHours(byDay.remoteOnlyArtiaHours || 0),
      remote_only_entry_count: Number(byDay.remoteOnlyArtiaEntryCount || 0),
      last_computed_at: computedAt,
      updated_at: computedAt
    };
  });

  const activityRollups = summaries.activitySummaries.map((summary) => ({
    user_id: userId,
    day,
    project_key: summary.projectKey,
    project_id: summary.projectId,
    project_number: summary.projectNumber,
    project_name: summary.projectName,
    project_label: summary.projectLabel,
    activity_key: summary.key,
    activity_id: summary.activityId,
    activity_label: summary.activityLabel,
    system_hours: roundHours(summary.systemHours),
    synced_hours: roundHours(summary.syncedSystemHours),
    pending_hours: roundHours(summary.pendingSystemHours),
    manual_hours: roundHours(summary.manualSystemHours),
    system_event_count: Number(summary.systemEventCount || 0),
    artia_hours: roundHours(summary.artiaHours),
    artia_entry_count: Number(summary.artiaEntryCount || 0),
    remote_only_hours: roundHours(summary.remoteOnlyArtiaHours),
    remote_only_entry_count: Number(summary.remoteOnlyArtiaEntryCount || 0),
    last_computed_at: computedAt,
    updated_at: computedAt
  }));

  return {
    eventRows,
    dayRollup,
    projectRollups,
    activityRollups
  };
}
