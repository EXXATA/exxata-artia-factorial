import { WorkedHoursComparison } from '../../../domain/value-objects/WorkedHoursComparison.js';
import {
  groupByDay,
  matchesActivityFilter,
  matchesProjectFilter,
  normalizeDayRollupRow,
  normalizeEventProjectionRow
} from './eventSerialization.js';
import { roundHours } from './shared.js';
import { buildProjectAndActivitySummaries } from './summaryBuilder.js';

export function buildWeekViewResponse(eventRows, dayRows, options = {}) {
  const normalizedEvents = (eventRows || []).map((row) => normalizeEventProjectionRow(row));
  const filteredEvents = normalizedEvents
    .filter((event) => matchesProjectFilter(options.project, event))
    .filter((event) => matchesActivityFilter(options.activity, event.activityId, event.activityLabel));
  const filteredEventsByDay = groupByDay(filteredEvents, 'day');

  const dayDetails = (dayRows || []).map((row) => normalizeDayRollupRow(row));
  const dailyDetails = dayDetails
    .map((detail) => {
      const filteredArtiaEntries = (detail.artiaEntries || [])
        .filter((entry) => matchesProjectFilter(options.project, entry))
        .filter((entry) => matchesActivityFilter(options.activity, entry.activityId, entry.activityLabel));
      const matchedEntryIds = new Set(
        (filteredEventsByDay[detail.date] || [])
          .map((event) => event.artiaRemoteEntryId)
          .filter(Boolean)
      );
      const remoteOnlyEntries = filteredArtiaEntries.filter((entry) => !matchedEntryIds.has(entry.id));
      const systemEvents = filteredEventsByDay[detail.date] || [];

      return {
        ...new WorkedHoursComparison({
          date: detail.date,
          factorialHours: detail.factorialHours,
          artiaHours: filteredArtiaEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
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
          artiaEntryCount: filteredArtiaEntries.length
        }).toJSON(),
        systemEvents,
        artiaEntries: filteredArtiaEntries,
        remoteOnlyArtiaEntries: remoteOnlyEntries,
        artiaSourceAvailable: detail.artiaSourceAvailable,
        artiaSourceTable: detail.artiaSourceTable,
        artiaReadReason: detail.artiaReadReason
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  const summaries = buildProjectAndActivitySummaries({
    comparisons: dailyDetails,
    systemEvents: filteredEvents,
    artiaEntries: dailyDetails.flatMap((detail) => detail.artiaEntries || []),
    remoteOnlyEntryIds: new Set(dailyDetails.flatMap((detail) => (detail.remoteOnlyArtiaEntries || []).map((entry) => entry.id)))
  });

  const stats = {
    totalDays: dailyDetails.length,
    daysWithDivergence: dailyDetails.filter((comparison) => comparison.hasDivergence).length,
    daysPendingSync: dailyDetails.filter((comparison) => comparison.hasPendingSync).length,
    totalFactorialHours: roundHours(dailyDetails.reduce((sum, comparison) => sum + Number(comparison.factorialHours || 0), 0)),
    totalArtiaHours: roundHours(dailyDetails.reduce((sum, comparison) => sum + Number(comparison.artiaHours || 0), 0)),
    totalSystemHours: roundHours(dailyDetails.reduce((sum, comparison) => sum + Number(comparison.systemHours || 0), 0)),
    totalSyncedSystemHours: roundHours(dailyDetails.reduce((sum, comparison) => sum + Number(comparison.syncedSystemHours || 0), 0)),
    totalPendingSystemHours: roundHours(dailyDetails.reduce((sum, comparison) => sum + Number(comparison.pendingSystemHours || 0), 0)),
    totalManualSystemHours: roundHours(dailyDetails.reduce((sum, comparison) => sum + Number(comparison.manualSystemHours || 0), 0)),
    artiaSourceAvailable: dailyDetails.some((detail) => detail.artiaSourceAvailable),
    artiaSourceTable: dailyDetails.find((detail) => detail.artiaSourceTable)?.artiaSourceTable || null,
    artiaReadReason: dailyDetails.find((detail) => detail.artiaReadReason)?.artiaReadReason || null,
    projectCount: summaries.projectSummaries.length,
    activityCount: summaries.activitySummaries.length,
    remoteOnlyArtiaEntries: dailyDetails.reduce((sum, detail) => sum + (detail.remoteOnlyArtiaEntries?.length || 0), 0),
    filtersApplied: {
      startDate: options.startDate,
      endDate: options.endDate,
      project: options.project || null,
      activity: options.activity || null
    }
  };

  return {
    events: filteredEvents,
    comparisons: dailyDetails.map((detail) => ({
      date: detail.date,
      factorialHours: detail.factorialHours,
      artiaHours: detail.artiaHours,
      systemHours: detail.systemHours,
      syncedSystemHours: detail.syncedSystemHours,
      pendingSystemHours: detail.pendingSystemHours,
      manualSystemHours: detail.manualSystemHours,
      artiaEntryCount: detail.artiaEntryCount,
      difference: detail.difference,
      systemDifference: detail.systemDifference,
      hasPendingSync: detail.hasPendingSync,
      hasDivergence: detail.hasDivergence,
      status: detail.status,
      statusColor: detail.statusColor
    })),
    dailyDetails,
    projectSummaries: summaries.projectSummaries,
    activitySummaries: summaries.activitySummaries,
    availableProjects: summaries.availableProjects,
    availableActivities: summaries.availableActivities,
    stats,
    meta: {
      startDate: options.startDate,
      endDate: options.endDate,
      filterProject: options.project || null,
      filterActivity: options.activity || null,
      accessibleProjectCount: Number(options.accessibleProjectCount || 0),
      projectAccessLastSyncedAt: options.projectAccessLastSyncedAt || null,
      lastComputedAt: dayRows.reduce((latest, row) => {
        const current = row.last_computed_at || null;
        return !latest || (current && current > latest) ? current : latest;
      }, null)
    }
  };
}
