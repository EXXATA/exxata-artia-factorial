import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useCreateEvent, useUpdateEvent } from '../../hooks/useEvents';
import { getEventMinutesByDay } from '../../utils/eventViewUtils';
import { calculateDuration } from '../../utils/timeUtils';
import TableDetailRow from './TableDetailRow';
import TableAutosaveStatus from './TableAutosaveStatus.jsx';
import { TABLE_DETAIL_COLUMNS, TABLE_DETAIL_TABLE_MIN_WIDTH } from './tableDetailColumns.js';
import { useTableCellEditing } from './useTableCellEditing.js';
import { buildInlineDraftRow } from './tableEditingUtils.js';
import { buildRemoteOnlyRows, sortRowsByDayAndStart } from './tableViewUtils';

const EMPTY_FLAGS = Object.freeze([]);
const EMPTY_ROWS = Object.freeze([]);

const TableDetailTable = forwardRef(function TableDetailTable({
  dailyDetails = [],
  dailyDetailsByDate,
  onSelectEvent,
  onSelectRemoteEntry,
  events = [],
  projects = [],
  onPersistedChange = null
}, ref) {
  const createEventMutation = useCreateEvent({
    showSuccessToast: false,
    showErrorToast: false,
    invalidateQueries: false
  });
  const updateEventMutation = useUpdateEvent({
    showSuccessToast: false,
    showErrorToast: false,
    invalidateQueries: false
  });

  const {
    activeCell,
    draftRowsById,
    errorCellsByRowId,
    optimisticSystemRows,
    pendingCommitCountsByRowId,
    savingCellsByRowId,
    lastErrorMessage,
    lastSavedAt,
    activateCell,
    clearEditingState,
    commitCellOnChange,
    handleCellBlur,
    handleCellKeyDown,
    insertDraftRow,
    updateCellValue
  } = useTableCellEditing({
    events,
    projects,
    createEventMutation,
    updateEventMutation,
    onPersistedChange
  });

  const mergedSystemRows = useMemo(() => {
    const optimisticRowsById = new Map(optimisticSystemRows.map((event) => [event.id, event]));
    const serverEventIds = new Set(events.map((event) => event.id));
    const mergedRows = events.map((event) => optimisticRowsById.get(event.id) || event);

    for (const optimisticEvent of optimisticSystemRows) {
      if (!serverEventIds.has(optimisticEvent.id)) {
        mergedRows.push(optimisticEvent);
      }
    }

    return mergedRows.sort(sortRowsByDayAndStart);
  }, [events, optimisticSystemRows]);

  const minutesByDay = useMemo(
    () => getEventMinutesByDay(mergedSystemRows),
    [mergedSystemRows]
  );

  const inlineDraft = draftRowsById['draft-inline'] || null;
  const inlineDraftRow = useMemo(() => {
    if (!inlineDraft) {
      return EMPTY_ROWS;
    }

    return [buildInlineDraftRow(inlineDraft)].filter(Boolean);
  }, [inlineDraft]);

  const systemRows = useMemo(
    () => mergedSystemRows.map((event) => ({
      rowType: 'system',
      ...event,
      effortMinutes: calculateDuration(event.start, event.end)
    })),
    [mergedSystemRows]
  );

  const remoteOnlyRows = useMemo(
    () => buildRemoteOnlyRows(dailyDetails),
    [dailyDetails]
  );

  const rows = useMemo(() => {
    return [...systemRows, ...inlineDraftRow, ...remoteOnlyRows].sort(sortRowsByDayAndStart);
  }, [inlineDraftRow, remoteOnlyRows, systemRows]);

  const rowsRef = useRef(rows);
  const activateCellRef = useRef(activateCell);
  const blurHandlerRef = useRef(handleCellBlur);
  const changeCommitHandlerRef = useRef(commitCellOnChange);
  const keyDownHandlerRef = useRef(handleCellKeyDown);
  const valueChangeHandlerRef = useRef(updateCellValue);
  const latestDraftsRef = useRef(draftRowsById);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    latestDraftsRef.current = draftRowsById;
  }, [draftRowsById]);

  useEffect(() => {
    activateCellRef.current = activateCell;
    blurHandlerRef.current = handleCellBlur;
    changeCommitHandlerRef.current = commitCellOnChange;
    keyDownHandlerRef.current = handleCellKeyDown;
    valueChangeHandlerRef.current = updateCellValue;
  }, [activateCell, commitCellOnChange, handleCellBlur, handleCellKeyDown, updateCellValue]);

  const handleActivateCell = useCallback((row, columnKey) => (
    activateCellRef.current(row, columnKey)
  ), []);

  const handleBlurCell = useCallback((row, columnKey) => (
    blurHandlerRef.current(
      row,
      columnKey,
      rowsRef.current,
      latestDraftsRef.current[row.id] || null
    )
  ), []);

  const handleKeyDownCell = useCallback((row, columnKey, keyboardEvent) => {
    keyDownHandlerRef.current(row, columnKey, keyboardEvent);
  }, []);

  const handleValueChange = useCallback((row, columnKey, nextValue) => {
    const nextDraft = valueChangeHandlerRef.current(row, columnKey, nextValue);

    if (nextDraft) {
      latestDraftsRef.current = {
        ...latestDraftsRef.current,
        [row.id]: nextDraft
      };
    }

    if (columnKey === 'activityLabel' && nextDraft && row.rowType !== 'draft') {
      changeCommitHandlerRef.current(row, columnKey, rowsRef.current, nextDraft);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    clearEditingState,
    insertInlineRow(day) {
      insertDraftRow(day);
    }
  }), [clearEditingState, insertDraftRow]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <TableAutosaveStatus
        isSaving={Object.keys(pendingCommitCountsByRowId).length > 0}
        lastSavedAt={lastSavedAt}
        lastErrorMessage={lastErrorMessage}
      />

      <section className="ui-table-shell">
        <div className="ui-table-scroll">
          <table
            className="w-full table-fixed border-collapse text-sm text-slate-700 dark:text-slate-200"
            style={{ minWidth: TABLE_DETAIL_TABLE_MIN_WIDTH }}
          >
            <colgroup>
              {TABLE_DETAIL_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead className="ui-table-head">
              <tr>
                {TABLE_DETAIL_COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_DETAIL_COLUMNS.length} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    Nenhum apontamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                rows.map((event) => (
                  <TableDetailRow
                    key={`${event.rowType}-${event.id}`}
                    activeColumnKey={activeCell?.rowId === event.id ? activeCell.columnKey : null}
                    dailyDetailsByDate={dailyDetailsByDate}
                    event={event}
                    rowDraft={draftRowsById[event.id] || null}
                    errorColumns={errorCellsByRowId[event.id] || EMPTY_FLAGS}
                    isRowPending={Boolean(pendingCommitCountsByRowId[event.id])}
                    minutesByDay={minutesByDay}
                    onActivateCell={handleActivateCell}
                    onCellBlur={handleBlurCell}
                    onCellKeyDown={handleKeyDownCell}
                    onCellValueChange={handleValueChange}
                    onSelectEvent={onSelectEvent}
                    onSelectRemoteEntry={onSelectRemoteEntry}
                    projects={projects}
                    savingColumns={savingCellsByRowId[event.id] || EMPTY_FLAGS}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});

export default TableDetailTable;
