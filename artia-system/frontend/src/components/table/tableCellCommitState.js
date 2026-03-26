import { getPersistedDraftForRow } from './tableCellEditingUtils.js';
import { setDraftSnapshot } from './tableCellDraftStore.js';

export function applyCreateCommitSuccessState({
  draftRowsRefCurrent,
  draftRowsById,
  persistedDraftsById,
  persistedEvent,
  activeCell
}) {
  const persistedDraft = getPersistedDraftForRow(persistedEvent);
  const nextDraftRowsRefCurrent = setDraftSnapshot(
    setDraftSnapshot(draftRowsRefCurrent, 'draft-inline', null),
    persistedEvent.id,
    persistedDraft
  );
  const nextDraftRowsById = { ...draftRowsById };
  delete nextDraftRowsById['draft-inline'];
  nextDraftRowsById[persistedEvent.id] = persistedDraft;

  const nextPersistedDraftsById = { ...persistedDraftsById };
  delete nextPersistedDraftsById['draft-inline'];
  nextPersistedDraftsById[persistedEvent.id] = persistedDraft;

  return {
    persistedDraft,
    nextDraftRowsRefCurrent,
    nextDraftRowsById,
    nextPersistedDraftsById,
    nextActiveCell: activeCell?.rowId === 'draft-inline'
      ? { ...activeCell, rowId: persistedEvent.id }
      : activeCell,
    lastSavedAt: persistedEvent.updatedAt || new Date().toISOString()
  };
}
