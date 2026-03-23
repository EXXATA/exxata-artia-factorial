import { addDays, formatDateBR, formatDateISO, startOfWeekMonday } from './dateUtils';
import { calculateDuration } from './timeUtils';

export const CALENDAR_START_HOUR = 0;
export const CALENDAR_END_HOUR = 24;
export const SLOT_MINUTES = 30;
export const ROW_HEIGHT = 44;
export const CALENDAR_SNAP_MINUTES = 1;
export const CALENDAR_MIN_EVENT_MINUTES = 1;
export const CALENDAR_DEFAULT_EVENT_DURATION = 50;
export const CALENDAR_GRID_START_MINUTES = CALENDAR_START_HOUR * 60;
export const CALENDAR_GRID_END_MINUTES = CALENDAR_END_HOUR * 60;

export function buildTimeOptions(stepMinutes = 1) {
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

export function extractTimeValue(isoDate, day = null) {
  if (!isoDate) return '';
  const date = new Date(isoDate);

  if (day) {
    const nextDay = addDays(new Date(`${day}T00:00:00`), 1);
    const isNextDayMidnight = (
      formatDateISO(date) === formatDateISO(nextDay)
      && date.getHours() === 0
      && date.getMinutes() === 0
    );

    if (isNextDayMidnight) {
      return '24:00';
    }
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function getEventMinuteRange(event) {
  if (!event?.start || !event?.end) {
    return {
      duration: 0,
      endMinutes: 0,
      isValid: false,
      startMinutes: 0
    };
  }

  const startDate = new Date(event.start);
  const duration = calculateDuration(event.start, event.end);

  if (Number.isNaN(startDate.getTime()) || duration <= 0) {
    return {
      duration: 0,
      endMinutes: 0,
      isValid: false,
      startMinutes: 0
    };
  }

  const startMinutes = (startDate.getHours() * 60) + startDate.getMinutes();

  return {
    duration,
    endMinutes: Math.min(24 * 60, startMinutes + duration),
    isValid: true,
    startMinutes
  };
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
  const { duration, isValid, startMinutes } = getEventMinuteRange(event);

  if (!isValid) {
    return {
      top: 0,
      height: 0
    };
  }

  const minutesFromGridStart = startMinutes - CALENDAR_START_HOUR * 60;
  const visibleDuration = Math.max(duration, CALENDAR_MIN_EVENT_MINUTES);

  return {
    top: (minutesFromGridStart / SLOT_MINUTES) * ROW_HEIGHT,
    height: Math.max((visibleDuration / SLOT_MINUTES) * ROW_HEIGHT - 4, 28)
  };
}

export function getClampedEventPosition(event, {
  gridStartMinutes = CALENDAR_GRID_START_MINUTES,
  gridEndMinutes = CALENDAR_GRID_END_MINUTES
} = {}) {
  if (!event?.start || !event?.end) {
    return {
      isVisible: false,
      isClampedStart: false,
      isClampedEnd: false,
      top: 0,
      height: 0
    };
  }

  const { duration, endMinutes, isValid, startMinutes } = getEventMinuteRange(event);
  if (!isValid) {
    return {
      isVisible: false,
      isClampedStart: false,
      isClampedEnd: false,
      top: 0,
      height: 0
    };
  }

  const clampedStart = Math.max(gridStartMinutes, startMinutes);
  const clampedEnd = Math.min(gridEndMinutes, endMinutes);
  const isVisible = clampedEnd > clampedStart;

  if (!isVisible) {
    return {
      isVisible: false,
      isClampedStart: startMinutes < gridStartMinutes,
      isClampedEnd: endMinutes > gridEndMinutes,
      top: 0,
      height: 0
    };
  }

  return {
    isVisible: true,
    isClampedStart: startMinutes < gridStartMinutes,
    isClampedEnd: endMinutes > gridEndMinutes,
    top: ((clampedStart - gridStartMinutes) / SLOT_MINUTES) * ROW_HEIGHT,
    height: Math.max(((clampedEnd - clampedStart) / SLOT_MINUTES) * ROW_HEIGHT - 4, 28)
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
