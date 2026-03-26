import { calculateDuration } from '../../utils/timeUtils.js';

export const ALL_OPTIMISTIC_FIELDS = Object.freeze([
  'day',
  'startTime',
  'endTime',
  'project',
  'activityLabel',
  'notes',
  'artiaLaunched',
  'workplace'
]);

export function toggleCellFlag(collection, rowId, columnKey, enabled) {
  const currentFlags = new Set(collection[rowId] || []);

  if (enabled) {
    currentFlags.add(columnKey);
  } else {
    currentFlags.delete(columnKey);
  }

  const nextCollection = { ...collection };
  if (currentFlags.size === 0) {
    delete nextCollection[rowId];
  } else {
    nextCollection[rowId] = Array.from(currentFlags);
  }

  return nextCollection;
}

export function buildOptimisticSystemRow(event) {
  return {
    rowType: 'system',
    ...event,
    effortMinutes: calculateDuration(event.start, event.end),
    hasProjectAccess: event.hasProjectAccess !== false
  };
}

export function areRowsEquivalent(serverRow, optimisticRow) {
  if (!serverRow || !optimisticRow) {
    return false;
  }

  return serverRow.start === optimisticRow.start
    && serverRow.end === optimisticRow.end
    && serverRow.day === optimisticRow.day
    && serverRow.project === optimisticRow.project
    && serverRow.activityId === optimisticRow.activityId
    && serverRow.activityLabel === optimisticRow.activityLabel
    && (serverRow.notes || '') === (optimisticRow.notes || '')
    && Boolean(serverRow.artiaLaunched) === Boolean(optimisticRow.artiaLaunched)
    && (serverRow.workplace || '') === (optimisticRow.workplace || '');
}

export function setOptimisticRow(collection, rowId, nextRow) {
  const nextCollection = { ...collection };

  if (!nextRow) {
    delete nextCollection[rowId];
    return nextCollection;
  }

  nextCollection[rowId] = nextRow;
  return nextCollection;
}

export function pruneStaleOptimisticRows(collection, serverRows = []) {
  const serverRowsById = new Map(serverRows.map((row) => [row.id, row]));
  const nextEntries = Object.entries(collection).filter(([rowId, optimisticRow]) => {
    const serverRow = serverRowsById.get(rowId);
    return !serverRow || !areRowsEquivalent(serverRow, optimisticRow);
  });

  return nextEntries.length === Object.keys(collection).length
    ? collection
    : Object.fromEntries(nextEntries);
}

export function restoreCommittedFieldValues({
  persistedDraft,
  currentDraft,
  overrideDraft = null,
  committedFields = []
}) {
  if (!persistedDraft) {
    return overrideDraft;
  }

  const nextDraft = {
    ...(overrideDraft || currentDraft || persistedDraft)
  };

  for (const field of committedFields) {
    nextDraft[field] = persistedDraft[field];
  }

  return nextDraft;
}
