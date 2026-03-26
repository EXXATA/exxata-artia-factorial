export function setDraftSnapshot(collection = {}, rowId, nextDraft) {
  const hasCurrentRow = Object.prototype.hasOwnProperty.call(collection, rowId);

  if (!nextDraft) {
    if (!hasCurrentRow) {
      return collection;
    }

    const nextCollection = { ...collection };
    delete nextCollection[rowId];
    return nextCollection;
  }

  if (hasCurrentRow && collection[rowId] === nextDraft) {
    return collection;
  }

  return {
    ...collection,
    [rowId]: nextDraft
  };
}

export function readDraftSnapshot({
  row = null,
  rowId = null,
  draftRowsById = {},
  persistedDraftsById = {},
  fallbackDraft = null,
  fallbackResolver = null
} = {}) {
  const resolvedRowId = rowId || row?.id;

  if (resolvedRowId && draftRowsById[resolvedRowId]) {
    return draftRowsById[resolvedRowId];
  }

  if (resolvedRowId && persistedDraftsById[resolvedRowId]) {
    return persistedDraftsById[resolvedRowId];
  }

  if (fallbackDraft) {
    return fallbackDraft;
  }

  if (row && typeof fallbackResolver === 'function') {
    return fallbackResolver(row);
  }

  return null;
}

export function resolveNextDraftSnapshot({
  currentDraftRows = {},
  rowId,
  updater,
  fallbackDraft = null
}) {
  const previousDraft = readDraftSnapshot({
    rowId,
    draftRowsById: currentDraftRows,
    fallbackDraft
  });
  const nextDraft = typeof updater === 'function'
    ? updater(previousDraft)
    : updater;

  return {
    previousDraft,
    nextDraft,
    nextDraftRowsById: setDraftSnapshot(currentDraftRows, rowId, nextDraft)
  };
}
