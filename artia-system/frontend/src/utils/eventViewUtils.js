import { addDays, formatDateBR, formatDateISO, startOfWeekMonday } from './dateUtils';
import { calculateDuration } from './timeUtils';

export const CALENDAR_START_HOUR = 6;
export const CALENDAR_END_HOUR = 22;
export const SLOT_MINUTES = 30;
export const ROW_HEIGHT = 44;
export const CALENDAR_SNAP_MINUTES = 10;
export const CALENDAR_MIN_EVENT_MINUTES = 10;
export const CALENDAR_DEFAULT_EVENT_DURATION = 50;
export const CALENDAR_GRID_START_MINUTES = CALENDAR_START_HOUR * 60;
export const CALENDAR_GRID_END_MINUTES = CALENDAR_END_HOUR * 60;

export function buildTimeOptions(stepMinutes = 10) {
  const options = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    options.push(minutesToTime(minutes));
  }

  options.push('24:00');

  return options;
}

export function minutesToTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 24 * 60));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function combineDayAndTime(day, time) {
  if (!day || !time) return '';

  if (time === '24:00') {
    const nextDay = addDays(new Date(`${day}T00:00:00`), 1);
    return new Date(`${formatDateISO(nextDay)}T00:00:00`).toISOString();
  }

  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(`${day}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function extractTimeValue(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatWorkedTime(minutes) {
  const safe = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatWeekRangeLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  return `${formatDateBR(weekStart)} - ${formatDateBR(weekEnd)}`;
}

export function getEventMinutesByDay(events) {
  return events.reduce((acc, event) => {
    const day = event.day;
    if (!day) return acc;
    acc[day] = (acc[day] || 0) + calculateDuration(event.start, event.end);
    return acc;
  }, {});
}

export function getEventPosition(event) {
  const date = new Date(event.start);
  const minutesFromGridStart = (date.getHours() * 60 + date.getMinutes()) - CALENDAR_START_HOUR * 60;
  const duration = Math.max(calculateDuration(event.start, event.end), 10);

  return {
    top: (minutesFromGridStart / SLOT_MINUTES) * ROW_HEIGHT,
    height: Math.max((duration / SLOT_MINUTES) * ROW_HEIGHT - 4, 28)
  };
}

export function clampCalendarMinutes(totalMinutes, min = CALENDAR_GRID_START_MINUTES, max = CALENDAR_GRID_END_MINUTES) {
  return Math.max(min, Math.min(max, totalMinutes));
}

export function snapMinutes(totalMinutes, stepMinutes = CALENDAR_SNAP_MINUTES, strategy = 'round') {
  const safeStep = Math.max(1, stepMinutes);
  const ratio = totalMinutes / safeStep;

  if (strategy === 'floor') {
    return Math.floor(ratio) * safeStep;
  }

  if (strategy === 'ceil') {
    return Math.ceil(ratio) * safeStep;
  }

  return Math.round(ratio) * safeStep;
}

export function gridOffsetToMinutes(offsetY) {
  const rawMinutes = CALENDAR_GRID_START_MINUTES + (offsetY / ROW_HEIGHT) * SLOT_MINUTES;
  return clampCalendarMinutes(rawMinutes);
}

export function getRangePosition(startMinutes, endMinutes) {
  const safeStart = clampCalendarMinutes(Math.min(startMinutes, endMinutes));
  const safeEnd = clampCalendarMinutes(Math.max(startMinutes, endMinutes));

  return {
    top: ((safeStart - CALENDAR_GRID_START_MINUTES) / SLOT_MINUTES) * ROW_HEIGHT,
    height: Math.max(((safeEnd - safeStart) / SLOT_MINUTES) * ROW_HEIGHT - 4, 28)
  };
}

export function getDefaultDraftFromSlot(day, minutesFromMidnight, defaultDuration = CALENDAR_DEFAULT_EVENT_DURATION) {
  const startMinutes = Math.max(0, minutesFromMidnight);
  const endMinutes = Math.min(24 * 60, startMinutes + defaultDuration);

  return {
    day,
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes)
  };
}

export function getDraftFromRange(day, startMinutes, endMinutes, minimumDuration = CALENDAR_MIN_EVENT_MINUTES) {
  const safeStart = clampCalendarMinutes(Math.min(startMinutes, endMinutes));
  const safeEnd = clampCalendarMinutes(Math.max(startMinutes, endMinutes));
  const finalEnd = Math.max(safeStart + minimumDuration, safeEnd);

  return {
    day,
    startTime: minutesToTime(safeStart),
    endTime: minutesToTime(Math.min(CALENDAR_GRID_END_MINUTES, finalEnd))
  };
}

export function normalizeProjectInput(value) {
  if (!value) return '';
  return String(value).split(' - ')[0].trim();
}

export function getWeekDaysIso(weekStart) {
  return Array.from({ length: 7 }, (_, index) => formatDateISO(addDays(weekStart, index)));
}

export function buildProjectWeeklySummary(events, weekDays) {
  const summary = new Map();

  events.forEach((event) => {
    const projectKey = String(event.project || 'Sem projeto');
    const duration = calculateDuration(event.start, event.end);

    if (!summary.has(projectKey)) {
      summary.set(projectKey, {
        project: projectKey,
        totalMinutes: 0,
        byDay: Object.fromEntries(weekDays.map((day) => [day, 0]))
      });
    }

    const projectSummary = summary.get(projectKey);
    projectSummary.totalMinutes += duration;
    projectSummary.byDay[event.day] = (projectSummary.byDay[event.day] || 0) + duration;
  });

  return Array.from(summary.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function buildTimelineSeries(events, groupBy) {
  const buckets = new Map();

  events.forEach((event) => {
    const date = new Date(event.day || event.start);
    const duration = calculateDuration(event.start, event.end);
    const key = groupBy === 'week' ? formatDateISO(startOfWeekMonday(date)) : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) || 0) + duration);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, minutes]) => ({
      label: groupBy === 'week' ? formatDateBR(key) : `${key.slice(5, 7)}/${key.slice(0, 4)}`,
      minutes
    }));
}

export function buildProjectDistribution(events) {
  const buckets = new Map();

  events.forEach((event) => {
    const key = String(event.project || 'Sem projeto');
    buckets.set(key, (buckets.get(key) || 0) + calculateDuration(event.start, event.end));
  });

  return Array.from(buckets.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([label, minutes]) => ({ label, minutes }));
}
