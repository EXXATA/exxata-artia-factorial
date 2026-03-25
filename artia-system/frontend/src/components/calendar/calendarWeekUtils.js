import { startOfWeekMonday } from '../../utils/dateUtils.js';

function padWeek(value) {
  return String(value).padStart(2, '0');
}

export function formatWeekInputValue(date) {
  const monday = startOfWeekMonday(date);
  const utcDate = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

  const isoYear = utcDate.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstThursdayDay);

  const weekNumber = 1 + Math.round((utcDate - firstThursday) / 604800000);

  return `${isoYear}-W${padWeek(weekNumber)}`;
}

export function getWeekStartFromInputValue(value) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(value || '').trim());

  if (!match) {
    return null;
  }

  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);

  if (!Number.isInteger(isoYear) || !Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53) {
    return null;
  }

  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);

  monday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1 + ((isoWeek - 1) * 7));

  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
}
