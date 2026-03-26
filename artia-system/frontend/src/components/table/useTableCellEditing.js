import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../services/api/apiError.js';
import { buildInlineDraft } from './tableEditingUtils.js';
import {
  EDITABLE_TABLE_CELL_ORDER,
  applyCellDraftChange,
  buildCellCommitPlan,
  getCellNavigationIntent,
  getNextActiveCell,
  getPersistedDraftForRow,
  shouldSkipDraftCommitForSelectionFlow
} from './tableCellEditingUtils.js';
import {
  readDraftSnapshot,
  resolveNextDraftSnapshot,
  setDraftSnapshot
} from './tableCellDraftStore.js';
import { buildOptimisticRowFromDraft } from './tableCellOptimisticUtils.js';
import {
  ALL_OPTIMISTIC_FIELDS,
  areRowsEquivalent,
  buildOptimisticSystemRow,
  pruneStaleOptimisticRows,
  restoreCommittedFieldValues,
  setOptimisticRow,
  toggleCellFlag
} from './tableCellStateUtils.js';
import { applyCreateCommitSuccessState } from './tableCellCommitState.js';

export function useTableCellEditing({
  events,
  projects,
  createEventMutation,
  updateEventMutation,
  onPersistedChange = null
}) {
  const [activeCell, setActiveCell] = useState(null);
  const [draftRowsById, setDraftRowsById] = useState({});
  const [pendingCommitCountsByRowId, setPendingCommitCountsByRowId] = useState({});
  const [savingCellsByRowId, setSavingCellsByRowId] = useState({});
  const [errorCellsByRowId, setErrorCellsByRowId] = useState({});
  const [optimisticRowsById, setOptimisticRowsById] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [lastErrorMessage, setLastErrorMessage] = useState(null);

  const persistedDraftsRef = useRef({});
  const draftRowsRef = useRef({});
  const eventsByIdRef = useRef(new Map());
  const commitQueuesRef = useRef(new Map());
  const commitSequenceRef = useRef(0);
  const latestFieldVersionsRef = useRef(new Map());
  const queuedActivationRef = useRef(null);
  const pendingNavigationRef = useRef(null);
  const errorTimeoutsRef = useRef(new Map());
  const skippedBlurCommitsRef = useRef(new Set());

  const optimisticSystemRows = useMemo(
    () => Object.values(optimisticRowsById),
    [optimisticRowsById]
  );

  useEffect(() => {
    eventsByIdRef.current = new Map(events.map((event) => [event.id, event]));
  }, [events]);

  useEffect(() => {
    const nextPersistedDrafts = { ...persistedDraftsRef.current };

    for (const row of [...events, ...optimisticSystemRows]) {
      const isPendingRow = Number(pendingCommitCountsByRowId[row.id] || 0) > 0;
      if (!isPendingRow) {
        nextPersistedDrafts[row.id] = getPersistedDraftForRow(row);
      }
    }

    persistedDraftsRef.current = nextPersistedDrafts;

    setOptimisticRowsById((current) => pruneStaleOptimisticRows(current, events));
  }, [events, optimisticSystemRows, pendingCommitCountsByRowId]);

  useEffect(() => () => {
    for (const timeoutId of errorTimeoutsRef.current.values()) {
      clearTimeout(timeoutId);
    }
  }, []);

  function getDraftForRow(row, overrideDraft = null) {
    return readDraftSnapshot({
      row,
      draftRowsById: draftRowsRef.current,
      persistedDraftsById: persistedDraftsRef.current,
      fallbackDraft: overrideDraft,
      fallbackResolver: getPersistedDraftForRow
    });
  }

  function setDraftForRow(rowId, updater, fallbackDraft = null) {
    const { nextDraft, nextDraftRowsById } = resolveNextDraftSnapshot({
      currentDraftRows: draftRowsRef.current,
      rowId,
      updater,
      fallbackDraft
    });

    draftRowsRef.current = nextDraftRowsById;
    setDraftRowsById((current) => setDraftSnapshot(current, rowId, nextDraft));
    return nextDraft;
  }

  function markCellSaving(rowId, columnKey, enabled) {
    setSavingCellsByRowId((current) => toggleCellFlag(current, rowId, columnKey, enabled));
  }

  function markRowPending(rowId, delta) {
    setPendingCommitCountsByRowId((current) => {
      const nextCount = Math.max(0, Number(current[rowId] || 0) + delta);
      const nextState = { ...current };

      if (nextCount === 0) {
        delete nextState[rowId];
      } else {
        nextState[rowId] = nextCount;
      }

      return nextState;
    });
  }

  function flashCellError(rowId, columnKey) {
    setErrorCellsByRowId((current) => toggleCellFlag(current, rowId, columnKey, true));

    const timeoutKey = `${rowId}:${columnKey}`;
    if (errorTimeoutsRef.current.has(timeoutKey)) {
      clearTimeout(errorTimeoutsRef.current.get(timeoutKey));
    }

    const timeoutId = setTimeout(() => {
      setErrorCellsByRowId((current) => toggleCellFlag(current, rowId, columnKey, false));
      errorTimeoutsRef.current.delete(timeoutKey);
    }, 1400);

    errorTimeoutsRef.current.set(timeoutKey, timeoutId);
  }

  function ensureDraftRow(row, fallbackDraft = null) {
    const persistedDraft = fallbackDraft || getPersistedDraftForRow(row);
    setDraftForRow(row.id, (currentDraft) => currentDraft || persistedDraft, persistedDraft);
    if (!persistedDraftsRef.current[row.id]) {
      persistedDraftsRef.current[row.id] = persistedDraft;
    }
  }

  const insertDraftRow = useCallback((fallbackDay) => {
    const initialDraft = buildInlineDraft({ fallbackDay });
    persistedDraftsRef.current['draft-inline'] = initialDraft;
    setDraftForRow('draft-inline', initialDraft);
    setActiveCell({ rowId: 'draft-inline', columnKey: EDITABLE_TABLE_CELL_ORDER[0] });
  }, []);

  const clearEditingState = useCallback(() => {
    queuedActivationRef.current = null;
    pendingNavigationRef.current = null;
    latestFieldVersionsRef.current = new Map();
    skippedBlurCommitsRef.current = new Set();
    setActiveCell(null);
    setDraftRowsById({});
    setPendingCommitCountsByRowId({});
    setSavingCellsByRowId({});
    setErrorCellsByRowId({});
    setOptimisticRowsById({});
    setLastSavedAt(null);
    setLastErrorMessage(null);
    draftRowsRef.current = {};
    persistedDraftsRef.current = {};
  }, []);

  function activateCell(row, columnKey) {
    if (!row || !columnKey) {
      return 'idle';
    }

    if (activeCell && (activeCell.rowId !== row.id || activeCell.columnKey !== columnKey)) {
      queuedActivationRef.current = { rowId: row.id, columnKey };
      return 'queued';
    }

    ensureDraftRow(row, row.rowType === 'draft' ? draftRowsById[row.id] || persistedDraftsRef.current[row.id] || buildInlineDraft({ fallbackDay: row.day }) : null);
    setActiveCell({ rowId: row.id, columnKey });
    return activeCell?.rowId === row.id && activeCell?.columnKey === columnKey
      ? 'active'
      : 'activated';
  }

  function updateCellValue(row, columnKey, nextValue) {
    const baseDraft = getDraftForRow(row);
    const nextDraft = applyCellDraftChange(baseDraft, columnKey, nextValue);
    setDraftForRow(row.id, nextDraft);

    if (columnKey === 'project') {
      queuedActivationRef.current = { rowId: row.id, columnKey: 'activityLabel' };
      setActiveCell({ rowId: row.id, columnKey: 'activityLabel' });
    }

    return nextDraft;
  }

  function queueCommit(rowId, task) {
    const previousPromise = commitQueuesRef.current.get(rowId) || Promise.resolve();
    const nextPromise = previousPromise
      .catch(() => undefined)
      .then(task);

    commitQueuesRef.current.set(rowId, nextPromise);
    return nextPromise.finally(() => {
      if (commitQueuesRef.current.get(rowId) === nextPromise) {
        commitQueuesRef.current.delete(rowId);
      }
    });
  }

  function getNextCommitVersion(rowId, committedFields) {
    const version = ++commitSequenceRef.current;
    const currentVersions = {
      ...(latestFieldVersionsRef.current.get(rowId) || {})
    };

    for (const field of committedFields) {
      currentVersions[field] = version;
    }

    latestFieldVersionsRef.current.set(rowId, currentVersions);
    return version;
  }

  function getLatestCommittedFields(rowId, committedFields, version) {
    const currentVersions = latestFieldVersionsRef.current.get(rowId) || {};
    return committedFields.filter((field) => currentVersions[field] === version);
  }

  function restoreCommittedFields(rowId, committedFields, overrideDraft = null) {
    const persistedDraft = persistedDraftsRef.current[rowId];
    const nextDraft = restoreCommittedFieldValues({
      persistedDraft,
      currentDraft: draftRowsRef.current[rowId],
      overrideDraft,
      committedFields
    });
    if (!nextDraft) {
      return overrideDraft;
    }
    setDraftForRow(rowId, nextDraft);
    return nextDraft;
  }

  function scheduleCommit(row, columnKey, commitPlan, draft) {
    const queueKey = row.id;
    const commitVersion = getNextCommitVersion(queueKey, commitPlan.committedFields);
    const isCreateCommit = commitPlan.type === 'create';

    if (!isCreateCommit) {
      const optimisticRow = buildOptimisticRowFromDraft({
        row,
        draft,
        committedFields: commitPlan.committedFields,
        projects
      });

      if (optimisticRow) {
        setOptimisticRowsById((current) => setOptimisticRow(current, row.id, optimisticRow));
      }
    }

    setLastErrorMessage(null);
    markRowPending(row.id, 1);

    void queueCommit(queueKey, async () => {
      markCellSaving(row.id, columnKey, true);

      try {
        const response = isCreateCommit
          ? await createEventMutation.mutateAsync(commitPlan.payload)
          : await updateEventMutation.mutateAsync({
            id: row.id,
            data: commitPlan.payload
          });

        const persistedEvent = response?.data || response || null;
        if (!persistedEvent) {
          return;
        }

        const latestCommittedFields = getLatestCommittedFields(
          queueKey,
          commitPlan.committedFields,
          commitVersion
        );

        if (isCreateCommit) {
          const createState = applyCreateCommitSuccessState({
            draftRowsRefCurrent: draftRowsRef.current,
            draftRowsById: draftRowsRef.current,
            persistedDraftsById: persistedDraftsRef.current,
            persistedEvent
          });
          draftRowsRef.current = createState.nextDraftRowsRefCurrent;
          persistedDraftsRef.current = createState.nextPersistedDraftsById;
          setDraftRowsById(createState.nextDraftRowsById);
          setOptimisticRowsById((current) => setOptimisticRow(current, persistedEvent.id, buildOptimisticSystemRow(persistedEvent)));
          setActiveCell((current) => (
            current?.rowId === 'draft-inline'
              ? { ...current, rowId: persistedEvent.id }
              : current
          ));
          setLastSavedAt(createState.lastSavedAt);
          setLastErrorMessage(null);
          onPersistedChange?.(persistedEvent, commitPlan.type, commitPlan.committedFields);
          return;
        }

        persistedDraftsRef.current[persistedEvent.id] = getPersistedDraftForRow(persistedEvent);

        if (latestCommittedFields.length > 0) {
          setLastSavedAt(persistedEvent.updatedAt || new Date().toISOString());
          setLastErrorMessage(null);
          onPersistedChange?.(persistedEvent, commitPlan.type, latestCommittedFields);
        }
      } catch (error) {
        const latestCommittedFields = getLatestCommittedFields(
          queueKey,
          commitPlan.committedFields,
          commitVersion
        );

        if (latestCommittedFields.length > 0) {
          const errorMessage = getApiErrorMessage(error, 'Erro ao sincronizar a edicao');

          if (row.rowType === 'draft') {
            setDraftForRow(row.id, draft);
          } else {
            const restoredDraft = restoreCommittedFields(row.id, latestCommittedFields);
            const serverRow = eventsByIdRef.current.get(row.id) || row;
            const rebuiltOptimisticRow = buildOptimisticRowFromDraft({
              row: serverRow,
              draft: restoredDraft,
              committedFields: ALL_OPTIMISTIC_FIELDS,
              projects
            });

            setOptimisticRowsById((current) => (
              areRowsEquivalent(serverRow, rebuiltOptimisticRow)
                ? setOptimisticRow(current, row.id, null)
                : setOptimisticRow(current, row.id, rebuiltOptimisticRow)
            ));
          }

          flashCellError(row.id, columnKey);
          setLastErrorMessage(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        markCellSaving(row.id, columnKey, false);
        markRowPending(row.id, -1);
      }
    });
  }

  function buildBlurCommitKey(rowId, columnKey) {
    return `${rowId}:${columnKey}`;
  }

  function markBlurCommitSkipped(rowId, columnKey) {
    skippedBlurCommitsRef.current.add(buildBlurCommitKey(rowId, columnKey));
  }

  function consumeSkippedBlurCommit(rowId, columnKey) {
    const commitKey = buildBlurCommitKey(rowId, columnKey);
    const shouldSkip = skippedBlurCommitsRef.current.has(commitKey);

    if (shouldSkip) {
      skippedBlurCommitsRef.current.delete(commitKey);
    }

    return shouldSkip;
  }

  function commitCell(row, columnKey, overrideDraft = null) {
    const draft = getDraftForRow(row, overrideDraft);
    const commitPlan = buildCellCommitPlan({
      row,
      columnKey,
      draft,
      projects
    });

    if (commitPlan.type !== 'create' && commitPlan.type !== 'update') {
      return {
        rowId: row.id,
        persisted: false,
        queued: false
      };
    }

    scheduleCommit(row, columnKey, commitPlan, draft);

    return {
      rowId: row.id,
      persisted: false,
      queued: true,
      type: commitPlan.type
    };
  }

  function commitCellOnChange(row, columnKey, rows, latestDraft) {
    if (columnKey !== 'activityLabel') {
      return;
    }

    markBlurCommitSkipped(row.id, columnKey);
    commitCell(row, columnKey, latestDraft);
    setActiveCell(null);
  }

  function handleCellKeyDown(row, columnKey, keyboardEvent) {
    const direction = getCellNavigationIntent(keyboardEvent.key);
    if (!direction) {
      return;
    }

    keyboardEvent.preventDefault();
    pendingNavigationRef.current = {
      rowId: row.id,
      columnKey,
      direction
    };
    keyboardEvent.target?.blur?.();
  }

  function handleCellBlur(row, columnKey, rows, latestDraft = null) {
    const queuedActivation = queuedActivationRef.current;
    queuedActivationRef.current = null;

    const navigationIntent = pendingNavigationRef.current
      && pendingNavigationRef.current.rowId === row.id
      && pendingNavigationRef.current.columnKey === columnKey
      ? pendingNavigationRef.current
      : null;
    pendingNavigationRef.current = null;

    const shouldSkipCommit = consumeSkippedBlurCommit(row.id, columnKey)
      || shouldSkipDraftCommitForSelectionFlow({
        row,
        columnKey,
        queuedActivation
      });
    const commitResult = shouldSkipCommit
      ? {
        rowId: row.id,
        persisted: false,
        queued: false
      }
      : commitCell(row, columnKey, latestDraft);
    const nextRowId = commitResult?.rowId || row.id;
    const shouldStayClosedAfterCreate = commitResult?.queued && commitResult?.type === 'create';

    const nextCell = queuedActivation
      ? {
        rowId: queuedActivation.rowId === row.id && nextRowId !== row.id
          ? nextRowId
          : queuedActivation.rowId,
        columnKey: queuedActivation.columnKey
      }
      : shouldStayClosedAfterCreate
        ? null
      : navigationIntent?.direction === 'close'
        ? null
        : navigationIntent
        ? getNextActiveCell({
          rows,
          activeCell: {
            rowId: nextRowId,
            columnKey
          },
          direction: navigationIntent.direction
        })
        : null;

    setActiveCell(nextCell);
  }

  return {
    activeCell,
    draftRowsById,
    errorCellsByRowId,
    optimisticSystemRows,
    pendingCommitCountsByRowId,
    savingCellsByRowId,
    lastErrorMessage,
    lastSavedAt,
    clearEditingState,
    activateCell,
    handleCellBlur,
    commitCellOnChange,
    handleCellKeyDown,
    insertDraftRow,
    updateCellValue
  };
}
