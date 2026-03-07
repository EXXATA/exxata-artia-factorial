import { calculateDuration } from './timeUtils';

export function getArtiaSyncPresentation(status) {
  if (status === 'synced') {
    return {
      label: 'Sincronizado',
      accentClassName: 'text-emerald-200',
      badgeClassName: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
      blockClassName: 'border-emerald-400/40 bg-[linear-gradient(180deg,rgba(16,185,129,0.28),rgba(6,78,59,0.92))] hover:border-emerald-300/70',
      legendClassName: 'bg-emerald-400'
    };
  }

  if (status === 'manual') {
    return {
      label: 'Marcado manualmente',
      accentClassName: 'text-amber-200',
      badgeClassName: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
      blockClassName: 'border-amber-400/40 bg-[linear-gradient(180deg,rgba(245,158,11,0.25),rgba(120,53,15,0.9))] hover:border-amber-300/70',
      legendClassName: 'bg-amber-400'
    };
  }

  return {
    label: 'Pendente',
    accentClassName: 'text-sky-200',
    badgeClassName: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
    blockClassName: 'border-sky-400/35 bg-[linear-gradient(180deg,rgba(59,130,246,0.24),rgba(17,24,39,0.94))] hover:border-sky-300/70',
    legendClassName: 'bg-sky-400'
  };
}

export function getEventSyncBreakdownByDay(events) {
  return events.reduce((accumulator, event) => {
    const day = event.day;
    if (!day) {
      return accumulator;
    }

    const duration = calculateDuration(event.start, event.end);
    if (!accumulator[day]) {
      accumulator[day] = {
        totalMinutes: 0,
        syncedMinutes: 0,
        pendingMinutes: 0,
        manualMinutes: 0
      };
    }

    accumulator[day].totalMinutes += duration;

    if (event.artiaSyncStatus === 'synced') {
      accumulator[day].syncedMinutes += duration;
      return accumulator;
    }

    accumulator[day].pendingMinutes += duration;

    if (event.artiaSyncStatus === 'manual') {
      accumulator[day].manualMinutes += duration;
    }

    return accumulator;
  }, {});
}

export function buildProjectWeeklySyncSummary(events, weekDays) {
  const summary = new Map();

  events.forEach((event) => {
    const projectKey = String(event.project || 'Sem projeto');
    const duration = calculateDuration(event.start, event.end);

    if (!summary.has(projectKey)) {
      summary.set(projectKey, {
        project: projectKey,
        totalMinutes: 0,
        syncedMinutes: 0,
        pendingMinutes: 0,
        manualMinutes: 0,
        byDay: Object.fromEntries(weekDays.map((day) => [day, {
          totalMinutes: 0,
          syncedMinutes: 0,
          pendingMinutes: 0,
          manualMinutes: 0
        }]))
      });
    }

    const projectSummary = summary.get(projectKey);
    const daySummary = projectSummary.byDay[event.day] || {
      totalMinutes: 0,
      syncedMinutes: 0,
      pendingMinutes: 0,
      manualMinutes: 0
    };

    projectSummary.totalMinutes += duration;
    daySummary.totalMinutes += duration;

    if (event.artiaSyncStatus === 'synced') {
      projectSummary.syncedMinutes += duration;
      daySummary.syncedMinutes += duration;
    } else {
      projectSummary.pendingMinutes += duration;
      daySummary.pendingMinutes += duration;

      if (event.artiaSyncStatus === 'manual') {
        projectSummary.manualMinutes += duration;
        daySummary.manualMinutes += duration;
      }
    }

    projectSummary.byDay[event.day] = daySummary;
  });

  return Array.from(summary.values()).sort((left, right) => right.totalMinutes - left.totalMinutes);
}
