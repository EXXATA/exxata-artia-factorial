import { roundHours } from './shared.js';

export function buildProjectAndActivitySummaries({ comparisons, systemEvents, artiaEntries, remoteOnlyEntryIds }) {
  const projectMap = new Map();
  const activityMap = new Map();
  const comparisonByDate = Object.fromEntries(comparisons.map((comparison) => [comparison.date, comparison]));

  const ensureProjectSummary = (projectDescriptor) => {
    if (!projectMap.has(projectDescriptor.key)) {
      projectMap.set(projectDescriptor.key, {
        projectKey: projectDescriptor.key,
        projectId: projectDescriptor.id,
        projectNumber: projectDescriptor.number,
        projectName: projectDescriptor.name,
        projectLabel: projectDescriptor.label,
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

    return projectMap.get(projectDescriptor.key);
  };

  const ensureProjectDay = (projectSummary, day) => {
    if (!projectSummary.byDay[day]) {
      const comparison = comparisonByDate[day] || null;
      projectSummary.byDay[day] = {
        day,
        factorialHours: comparison?.factorialHours || 0,
        systemHours: 0,
        syncedSystemHours: 0,
        pendingSystemHours: 0,
        manualSystemHours: 0,
        artiaHours: 0,
        artiaEntryCount: 0,
        remoteOnlyArtiaHours: 0,
        remoteOnlyArtiaEntryCount: 0
      };
    }

    return projectSummary.byDay[day];
  };

  const ensureActivitySummary = (projectDescriptor, activityId, activityLabel) => {
    const key = `${projectDescriptor.key}::${activityId || activityLabel || 'sem-atividade'}`;
    if (!activityMap.has(key)) {
        activityMap.set(key, {
          key,
          projectKey: projectDescriptor.key,
          projectId: projectDescriptor.id,
          projectNumber: projectDescriptor.number,
          projectName: projectDescriptor.name,
          projectLabel: projectDescriptor.label,
          activityId: activityId || null,
          activityLabel: activityLabel || 'Sem atividade',
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

    return activityMap.get(key);
  };

  systemEvents.forEach((event) => {
    const projectDescriptor = {
      key: event.projectKey,
      id: event.projectId,
      number: event.projectNumber,
      name: event.projectName,
      label: event.projectLabel
    };
    const projectSummary = ensureProjectSummary(projectDescriptor);
    const daySummary = ensureProjectDay(projectSummary, event.day);
    const activitySummary = ensureActivitySummary(projectDescriptor, event.activityId, event.activityLabel);

    projectSummary.systemHours += event.hours;
    projectSummary.systemEventCount += 1;
    daySummary.systemHours += event.hours;

    if (event.artiaSyncStatus === 'synced') {
      projectSummary.syncedSystemHours += event.hours;
      daySummary.syncedSystemHours += event.hours;
    } else {
      projectSummary.pendingSystemHours += event.hours;
      daySummary.pendingSystemHours += event.hours;

      if (event.artiaSyncStatus === 'manual') {
        projectSummary.manualSystemHours += event.hours;
        daySummary.manualSystemHours += event.hours;
      }
    }

      activitySummary.systemHours += event.hours;
      if (event.artiaSyncStatus === 'synced') {
        activitySummary.syncedSystemHours += event.hours;
      } else {
        activitySummary.pendingSystemHours += event.hours;
        if (event.artiaSyncStatus === 'manual') {
          activitySummary.manualSystemHours += event.hours;
        }
      }
      activitySummary.systemEventCount += 1;
    });

  artiaEntries.forEach((entry) => {
    const projectDescriptor = {
      key: entry.projectKey,
      id: entry.projectId,
      number: entry.projectNumber,
      name: entry.projectName,
      label: entry.projectLabel
    };
    const projectSummary = ensureProjectSummary(projectDescriptor);
    const daySummary = ensureProjectDay(projectSummary, entry.day);
    const activitySummary = ensureActivitySummary(projectDescriptor, entry.activityId, entry.activity);
    const isRemoteOnly = remoteOnlyEntryIds.has(entry.id);

    projectSummary.artiaHours += entry.hours;
    projectSummary.artiaEntryCount += 1;
    daySummary.artiaHours += entry.hours;
    daySummary.artiaEntryCount += 1;

    activitySummary.artiaHours += entry.hours;
    activitySummary.artiaEntryCount += 1;

    if (isRemoteOnly) {
      projectSummary.remoteOnlyArtiaHours += entry.hours;
      projectSummary.remoteOnlyArtiaEntryCount += 1;
      daySummary.remoteOnlyArtiaHours += entry.hours;
      daySummary.remoteOnlyArtiaEntryCount += 1;

      activitySummary.remoteOnlyArtiaHours += entry.hours;
      activitySummary.remoteOnlyArtiaEntryCount += 1;
    }
  });

  const projectSummaries = Array.from(projectMap.values())
    .map((summary) => ({
      ...summary,
      differenceHours: roundHours(summary.systemHours - summary.artiaHours),
      byDay: Object.values(summary.byDay).sort((left, right) => left.day.localeCompare(right.day))
    }))
    .sort((left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours));

  const activitySummaries = Array.from(activityMap.values())
    .map((summary) => ({
      ...summary,
      differenceHours: roundHours(summary.systemHours - summary.artiaHours)
    }))
    .sort((left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours));

  return {
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
    }))
  };
}
