import { roundHours } from './shared.js';

export function aggregateProjectSummaries(projectRows, dayDetailsByDate) {
  const grouped = new Map();

  projectRows.forEach((row) => {
    if (!grouped.has(row.projectKey)) {
      grouped.set(row.projectKey, {
        projectKey: row.projectKey,
        projectId: row.projectId,
        projectNumber: row.projectNumber,
        projectName: row.projectName,
        projectLabel: row.projectLabel,
        systemHours: 0,
        syncedSystemHours: 0,
        pendingSystemHours: 0,
        manualSystemHours: 0,
        systemEventCount: 0,
        artiaHours: 0,
        artiaEntryCount: 0,
        remoteOnlyArtiaHours: 0,
        remoteOnlyArtiaEntryCount: 0,
        byDay: {}
      });
    }

    const summary = grouped.get(row.projectKey);
    summary.systemHours += row.systemHours;
    summary.syncedSystemHours += row.syncedSystemHours;
    summary.pendingSystemHours += row.pendingSystemHours;
    summary.manualSystemHours += row.manualSystemHours;
    summary.systemEventCount += row.systemEventCount;
    summary.artiaHours += row.artiaHours;
    summary.artiaEntryCount += row.artiaEntryCount;
    summary.remoteOnlyArtiaHours += row.remoteOnlyArtiaHours;
    summary.remoteOnlyArtiaEntryCount += row.remoteOnlyArtiaEntryCount;
    summary.byDay[row.day] = {
      day: row.day,
      factorialHours: dayDetailsByDate[row.day]?.factorialHours || 0,
      systemHours: row.systemHours,
      syncedSystemHours: row.syncedSystemHours,
      pendingSystemHours: row.pendingSystemHours,
      manualSystemHours: row.manualSystemHours,
      artiaHours: row.artiaHours,
      artiaEntryCount: row.artiaEntryCount,
      remoteOnlyArtiaHours: row.remoteOnlyArtiaHours,
      remoteOnlyArtiaEntryCount: row.remoteOnlyArtiaEntryCount
    };
  });

  return Array.from(grouped.values())
    .map((summary) => ({
      ...summary,
      differenceHours: roundHours(summary.systemHours - summary.artiaHours),
      byDay: Object.values(summary.byDay).sort((left, right) => left.day.localeCompare(right.day))
    }))
    .sort((left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours));
}

export function aggregateActivitySummaries(activityRows) {
  const grouped = new Map();

  activityRows.forEach((row) => {
    if (!grouped.has(row.key)) {
      grouped.set(row.key, {
        key: row.key,
        projectKey: row.projectKey,
        projectId: row.projectId,
        projectNumber: row.projectNumber,
        projectName: row.projectName,
        projectLabel: row.projectLabel,
        activityId: row.activityId,
        activityLabel: row.activityLabel,
        systemHours: 0,
        syncedSystemHours: 0,
        pendingSystemHours: 0,
        manualSystemHours: 0,
        systemEventCount: 0,
        artiaHours: 0,
        artiaEntryCount: 0,
        remoteOnlyArtiaHours: 0,
        remoteOnlyArtiaEntryCount: 0
      });
    }

    const summary = grouped.get(row.key);
    summary.systemHours += row.systemHours;
    summary.syncedSystemHours += row.syncedSystemHours || 0;
    summary.pendingSystemHours += row.pendingSystemHours || 0;
    summary.manualSystemHours += row.manualSystemHours || 0;
    summary.systemEventCount += row.systemEventCount;
    summary.artiaHours += row.artiaHours;
    summary.artiaEntryCount += row.artiaEntryCount;
    summary.remoteOnlyArtiaHours += row.remoteOnlyArtiaHours;
    summary.remoteOnlyArtiaEntryCount += row.remoteOnlyArtiaEntryCount;
  });

  return Array.from(grouped.values())
    .map((summary) => ({
      ...summary,
      differenceHours: roundHours(summary.systemHours - summary.artiaHours)
    }))
    .sort((left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours));
}
