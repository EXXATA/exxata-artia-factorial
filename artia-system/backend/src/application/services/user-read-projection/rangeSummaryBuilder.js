import { WorkedHoursComparison } from '../../../domain/value-objects/WorkedHoursComparison.js';
import {
  matchesActivityFilter,
  matchesProjectFilter,
  normalizeActivityDayRollupRow,
  normalizeDayRollupRow,
  normalizeProjectDayRollupRow
} from './eventSerialization.js';
import { aggregateActivitySummaries, aggregateProjectSummaries } from './aggregateRollups.js';
import { roundHours } from './shared.js';

export function buildRangeSummaryResponse(dayRows, projectRows, activityRows, options = {}) {
  const normalizedDayRows = (dayRows || []).map((row) => normalizeDayRollupRow(row));
  const normalizedProjectRows = (projectRows || []).map((row) => normalizeProjectDayRollupRow(row));
  const normalizedActivityRows = (activityRows || []).map((row) => normalizeActivityDayRollupRow(row));
  const dayDetailsByDate = Object.fromEntries(normalizedDayRows.map((row) => [row.date, row]));

  const filteredProjectRows = normalizedProjectRows.filter((row) => matchesProjectFilter(options.project, row));
  const filteredActivityRows = normalizedActivityRows
    .filter((row) => matchesProjectFilter(options.project, row))
    .filter((row) => matchesActivityFilter(options.activity, row.activityId, row.activityLabel));

  const aggregatedByDay = new Map();
  const sourceRows = options.activity ? filteredActivityRows : filteredProjectRows;

  sourceRows.forEach((row) => {
    const day = row.day;
    if (!aggregatedByDay.has(day)) {
      aggregatedByDay.set(day, {
        systemHours: 0,
        syncedSystemHours: 0,
        pendingSystemHours: 0,
        manualSystemHours: 0,
        artiaHours: 0,
        artiaEntryCount: 0
      });
    }

    const bucket = aggregatedByDay.get(day);
    bucket.systemHours += Number(row.systemHours || 0);
    bucket.artiaHours += Number(row.artiaHours || 0);
    bucket.artiaEntryCount += Number(row.artiaEntryCount || 0);
    bucket.syncedSystemHours += Number(row.syncedSystemHours || 0);
    bucket.pendingSystemHours += Number(row.pendingSystemHours || 0);
    bucket.manualSystemHours += Number(row.manualSystemHours || 0);
  });

  const dailyDetails = normalizedDayRows
    .map((row) => {
      const aggregated = (!options.project && !options.activity)
        ? {
          systemHours: row.systemHours,
          syncedSystemHours: row.syncedSystemHours,
          pendingSystemHours: row.pendingSystemHours,
          manualSystemHours: row.manualSystemHours,
          artiaHours: row.artiaHours,
          artiaEntryCount: row.artiaEntryCount
        }
        : (aggregatedByDay.get(row.date) || {
          systemHours: 0,
          syncedSystemHours: 0,
          pendingSystemHours: 0,
          manualSystemHours: 0,
          artiaHours: 0,
          artiaEntryCount: 0
        });

      return {
        ...new WorkedHoursComparison({
          date: row.date,
          factorialHours: row.factorialHours,
          artiaHours: aggregated.artiaHours,
          systemHours: aggregated.systemHours,
          syncedSystemHours: aggregated.syncedSystemHours,
          pendingSystemHours: aggregated.pendingSystemHours,
          manualSystemHours: aggregated.manualSystemHours,
          artiaEntryCount: aggregated.artiaEntryCount
        }).toJSON(),
        systemEvents: [],
        artiaEntries: [],
        remoteOnlyArtiaEntries: []
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  const projectSummaries = aggregateProjectSummaries(
    options.activity ? filteredActivityRows : filteredProjectRows,
    dayDetailsByDate
  );
  const activitySummaries = aggregateActivitySummaries(filteredActivityRows);

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
    artiaSourceAvailable: normalizedDayRows.some((row) => row.artiaSourceAvailable),
    artiaSourceTable: normalizedDayRows.find((row) => row.artiaSourceTable)?.artiaSourceTable || null,
    artiaReadReason: normalizedDayRows.find((row) => row.artiaReadReason)?.artiaReadReason || null,
    projectCount: projectSummaries.length,
    activityCount: activitySummaries.length,
    remoteOnlyArtiaEntries: 0,
    filtersApplied: {
      startDate: options.startDate,
      endDate: options.endDate,
      project: options.project || null,
      activity: options.activity || null
    }
  };

  return {
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
    projectSummaries,
    activitySummaries,
    availableProjects: projectSummaries.map((summary) => ({
      key: summary.projectKey,
      id: summary.projectId,
      number: summary.projectNumber,
      name: summary.projectName,
      label: summary.projectLabel
    })),
    availableActivities: activitySummaries.map((summary) => ({
      key: summary.key,
      projectKey: summary.projectKey,
      activityId: summary.activityId,
      activityLabel: summary.activityLabel
    })),
    stats,
    meta: {
      startDate: options.startDate,
      endDate: options.endDate,
      mode: 'summary'
    }
  };
}
