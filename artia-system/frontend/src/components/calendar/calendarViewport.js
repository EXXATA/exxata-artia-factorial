import { ROW_HEIGHT, SLOT_MINUTES, formatWorkedTime } from '../../utils/eventViewUtils.js';

export const CALENDAR_DEFAULT_FOCUS_HOUR = 8;
export const TIME_COLUMN_WIDTH = 64;
export const DAY_HEADER_COLLAPSED_HEIGHT = 72;

export function getDefaultCalendarScrollTop({
  targetHour = CALENDAR_DEFAULT_FOCUS_HOUR,
  calendarStartHour = 0,
  rowHeight = ROW_HEIGHT,
  slotMinutes = SLOT_MINUTES
} = {}) {
  const safeTargetHour = Math.max(targetHour, calendarStartHour);
  const minutesFromStart = (safeTargetHour - calendarStartHour) * 60;

  return (minutesFromStart / slotMinutes) * rowHeight;
}

export function getCalendarViewportHeight({
  viewportHeight = 0,
  shellTop = 0,
  bottomOffset = 24,
  minHeight = 420
} = {}) {
  if (!viewportHeight || Number.isNaN(viewportHeight) || Number.isNaN(shellTop)) {
    return minHeight;
  }

  return Math.max(minHeight, Math.floor(viewportHeight - shellTop - bottomOffset));
}

function formatFactorialHours(hours) {
  return formatWorkedTime(Math.round((Number(hours) || 0) * 60));
}

export function buildCalendarDayHeaderMetrics({
  artiaMinutes = 0,
  dayComparison = null,
  dayMinutes = 0,
  syncBreakdown = null,
  unpositionedRemoteEntries = []
} = {}) {
  const details = [
    {
      label: 'Trabalho',
      value: formatWorkedTime(dayMinutes),
      tone: 'success'
    }
  ];

  if ((syncBreakdown?.pendingMinutes || 0) > 0) {
    details.push({
      label: 'Pend',
      value: formatWorkedTime(syncBreakdown.pendingMinutes),
      tone: 'neutral'
    });
  }

  if ((dayComparison?.remoteOnlyArtiaEntries || []).length > 0) {
    details.push({
      label: 'So Artia',
      value: String(dayComparison.remoteOnlyArtiaEntries.length),
      tone: 'violet'
    });
  }

  if (unpositionedRemoteEntries.length > 0) {
    details.push({
      label: 'Sem posicao',
      value: String(unpositionedRemoteEntries.length),
      tone: 'warning'
    });
  }

  return {
    footer: [
      { label: 'Fac', value: formatFactorialHours(dayComparison?.factorialHours) },
      { label: 'Artia', value: formatWorkedTime(artiaMinutes) }
    ],
    details
  };
}
