export function sortRowsByDayAndStart(left, right) {
  const byDay = left.day.localeCompare(right.day);
  if (byDay !== 0) {
    return byDay;
  }

  return new Date(left.start) - new Date(right.start);
}

export function filterEventsByActivity(events, activityFilter) {
  if (activityFilter === 'ALL') {
    return [...events].sort(sortRowsByDayAndStart);
  }

  const normalizedActivityFilter = activityFilter.trim().toLowerCase();
  return [...events]
    .filter((event) => event.activityLabel?.trim().toLowerCase() === normalizedActivityFilter)
    .sort(sortRowsByDayAndStart);
}

export function buildRemoteOnlyRows(dailyDetails) {
  return (dailyDetails || [])
    .flatMap((detail) => (detail.remoteOnlyArtiaEntries || []).map((entry) => ({
      rowType: 'artia_only',
      day: detail.date,
      id: entry.id,
      project: entry.projectDisplayLabel || entry.projectLabel || entry.project || 'Projeto Artia',
      start: entry.start,
      end: entry.end,
      effortMinutes: Math.round((Number(entry.hours) || 0) * 60),
      activityLabel: entry.activityLabel || entry.activity || 'Atividade Artia',
      notes: entry.notes || '',
      activityId: entry.activityId || '—',
      sourceStatus: entry.status || 'Somente Artia',
      artiaRemoteEntryId: entry.id,
      artiaRemoteHours: entry.hours || 0,
      endEstimated: Boolean(entry.endEstimated),
      sourceTable: entry.sourceTable || null,
      projectDisplayLabel: entry.projectDisplayLabel || entry.projectLabel || entry.project || 'Projeto Artia'
    })))
    .sort(sortRowsByDayAndStart);
}

export function getInclusiveDaySpan(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffInDays = Math.round((end.getTime() - start.getTime()) / 86400000);

  return diffInDays + 1;
}
