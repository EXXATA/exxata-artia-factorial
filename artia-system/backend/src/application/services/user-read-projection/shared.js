export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isSyntheticProjectNumber(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .startsWith('SEM-NUMERO-');
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function roundHours(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function toIsoDay(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  const stringValue = String(value);
  return stringValue.includes('T') ? stringValue.split('T')[0] : stringValue;
}
