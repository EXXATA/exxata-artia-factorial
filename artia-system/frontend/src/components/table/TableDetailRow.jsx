import { memo } from 'react';
import { formatDateBR } from '../../utils/dateUtils';
import { extractTimeValue, formatWorkedTime } from '../../utils/eventViewUtils';
import { InlineInput, InlineSelect, InlineStatusEditor } from './TableDetailInlineFields.jsx';
import TableDetailEditableCell from './TableDetailEditableCell.jsx';
import { ReadOnlyClamp, ReadOnlyMultiline, RemoteEntrySummary, StatusBadgeList } from './TableDetailReadOnlyCells.jsx';
import { buildTableDetailRowPresentation } from './tableDetailRowPresentation.js';

const BASE_CELL_CLASSNAME = 'px-4 py-3 align-top overflow-hidden';

function TableDetailRow({
  activeColumnKey,
  dailyDetailsByDate,
  errorColumns = [],
  event,
  isRowPending = false,
  minutesByDay,
  onActivateCell,
  onCellBlur,
  onCellKeyDown,
  onCellValueChange,
  onSelectEvent,
  onSelectRemoteEntry,
  projects = [],
  rowDraft: rowDraftProp = null,
  savingColumns = []
}) {
  const {
    isDraftRow,
    editable,
    rowDraft,
    selectedProject,
    draftDay,
    dayComparison,
    syncPresentation,
    effortMinutes,
    rowDayMinutes,
    computedActivityId
  } = buildTableDetailRowPresentation({
    event,
    rowDraft: rowDraftProp,
    dailyDetailsByDate,
    minutesByDay,
    projects,
    isRowPending
  });

  const isCellActive = (columnKey) => activeColumnKey === columnKey;
  const isCellSaving = (columnKey) => savingColumns.includes(columnKey);
  const isCellError = (columnKey) => errorColumns.includes(columnKey);

  return (
    <tr
      onClick={() => {
        if (event.rowType === 'artia_only') {
          onSelectRemoteEntry(event);
        }
      }}
      onDoubleClick={() => {
        if (event.rowType === 'system' && activeColumnKey === null) {
          onSelectEvent(event);
        }
      }}
      className={`ui-table-row ${event.rowType === 'artia_only' ? 'bg-violet-50 dark:bg-violet-500/5' : ''} ${isDraftRow ? 'bg-sky-50 dark:bg-sky-500/5' : ''} ${isRowPending ? 'opacity-90' : ''}`}
    >
      <td className={`${BASE_CELL_CLASSNAME} font-medium text-slate-900 dark:text-white`}>
        <TableDetailEditableCell
          active={isCellActive('day')}
          columnKey="day"
          editable={editable}
          hasError={isCellError('day')}
          isSaving={isCellSaving('day')}
          onActivate={() => onActivateCell(event, 'day')}
          onBlur={() => onCellBlur(event, 'day')}
          onKeyDown={(keyboardEvent) => onCellKeyDown(event, 'day', keyboardEvent)}
        >
          {isCellActive('day') ? (
            <InlineInput
              autoFocus
              type="date"
              value={rowDraft.day}
              onChange={(inputEvent) => onCellValueChange(event, 'day', inputEvent.target.value)}
              className="ui-mono"
            />
          ) : (
            formatDateBR(draftDay)
          )}
        </TableDetailEditableCell>
      </td>

      <td className={`${BASE_CELL_CLASSNAME} text-xs`}>
        <span className={`inline-flex rounded-full border px-2.5 py-1 ${
          event.rowType === 'system'
            ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
            : event.rowType === 'draft'
              ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100'
              : 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100'
        }`}>
          {event.rowType === 'system' ? 'Sistema' : event.rowType === 'draft' ? 'Novo' : 'Artia'}
        </span>
      </td>

      <td className={BASE_CELL_CLASSNAME}>
        <TableDetailEditableCell
          active={isCellActive('project')}
          columnKey="project"
          editable={editable}
          hasError={isCellError('project')}
          isSaving={isCellSaving('project')}
          onActivate={() => onActivateCell(event, 'project')}
          onBlur={() => onCellBlur(event, 'project')}
          onKeyDown={(keyboardEvent) => onCellKeyDown(event, 'project', keyboardEvent)}
        >
          {isCellActive('project') ? (
            <InlineSelect
              autoFocus
              autoOpen
              value={rowDraft.project}
              onChange={(inputEvent) => onCellValueChange(event, 'project', inputEvent.target.value)}
            >
              <option value="">Selecione um projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.number}>
                  {project.number} - {project.name}{project.active === false ? ' (Inativo)' : ''}
                </option>
              ))}
            </InlineSelect>
          ) : (
            <ReadOnlyMultiline value={rowDraft.project || event.project} />
          )}
        </TableDetailEditableCell>
      </td>

      <td className={`${BASE_CELL_CLASSNAME} ui-mono text-primary dark:text-primary-light`}>
        <TableDetailEditableCell
          active={isCellActive('startTime')}
          columnKey="startTime"
          editable={editable}
          hasError={isCellError('startTime')}
          isSaving={isCellSaving('startTime')}
          onActivate={() => onActivateCell(event, 'startTime')}
          onBlur={() => onCellBlur(event, 'startTime')}
          onKeyDown={(keyboardEvent) => onCellKeyDown(event, 'startTime', keyboardEvent)}
        >
          {isCellActive('startTime') ? (
            <InlineInput
              autoFocus
              type="time"
              step="60"
              value={rowDraft.startTime}
              onChange={(inputEvent) => onCellValueChange(event, 'startTime', inputEvent.target.value)}
            />
          ) : (
            rowDraft.startTime || extractTimeValue(event.start, event.day)
          )}
        </TableDetailEditableCell>
      </td>

      <td className={`${BASE_CELL_CLASSNAME} ui-mono text-primary dark:text-primary-light`}>
        <TableDetailEditableCell
          active={isCellActive('endTime')}
          columnKey="endTime"
          editable={editable}
          hasError={isCellError('endTime')}
          isSaving={isCellSaving('endTime')}
          onActivate={() => onActivateCell(event, 'endTime')}
          onBlur={() => onCellBlur(event, 'endTime')}
          onKeyDown={(keyboardEvent) => onCellKeyDown(event, 'endTime', keyboardEvent)}
        >
          {isCellActive('endTime') ? (
            <InlineInput
              autoFocus
              type="time"
              step="60"
              value={rowDraft.endTime}
              onChange={(inputEvent) => onCellValueChange(event, 'endTime', inputEvent.target.value)}
            />
          ) : (
            rowDraft.endTime || extractTimeValue(event.end, event.day)
          )}
        </TableDetailEditableCell>
      </td>

      <td className={`${BASE_CELL_CLASSNAME} ui-mono text-primary dark:text-primary-light`}>
        {formatWorkedTime(effortMinutes || event.effortMinutes)}
      </td>

      <td className={`${BASE_CELL_CLASSNAME} ui-mono text-emerald-700 dark:text-emerald-200`}>
        {formatWorkedTime(Math.max(0, rowDayMinutes))}
      </td>

      <td className={`${BASE_CELL_CLASSNAME} ui-mono text-slate-600 dark:text-slate-300`}>
        {formatWorkedTime(Math.round((dayComparison?.factorialHours || 0) * 60))}
      </td>

      <td className={BASE_CELL_CLASSNAME}>
        <TableDetailEditableCell
          active={isCellActive('activityLabel')}
          columnKey="activityLabel"
          editable={editable}
          hasError={isCellError('activityLabel')}
          isSaving={isCellSaving('activityLabel')}
          onActivate={() => onActivateCell(event, 'activityLabel')}
          onBlur={() => onCellBlur(event, 'activityLabel')}
          onKeyDown={(keyboardEvent) => onCellKeyDown(event, 'activityLabel', keyboardEvent)}
        >
          {isCellActive('activityLabel') ? (
            <InlineSelect
              autoFocus
              autoOpen
              value={rowDraft.activityLabel}
              onChange={(inputEvent) => onCellValueChange(event, 'activityLabel', inputEvent.target.value)}
              disabled={!selectedProject}
            >
              <option value="">
                {selectedProject ? 'Selecione uma atividade' : 'Escolha primeiro um projeto'}
              </option>
              {(selectedProject?.activities || []).map((activity) => (
                <option key={`${selectedProject.id}-${activity.id}`} value={activity.label}>
                  {activity.label}{activity.active === false ? ' (Inativa)' : ''}
                </option>
              ))}
            </InlineSelect>
          ) : (
            <ReadOnlyMultiline value={rowDraft.activityLabel || event.activityLabel} />
          )}
        </TableDetailEditableCell>
      </td>

      <td className={`${BASE_CELL_CLASSNAME} text-slate-500 dark:text-slate-400`}>
        <TableDetailEditableCell
          active={isCellActive('notes')}
          columnKey="notes"
          editable={editable}
          hasError={isCellError('notes')}
          isSaving={isCellSaving('notes')}
          onActivate={() => onActivateCell(event, 'notes')}
          onBlur={() => onCellBlur(event, 'notes')}
          onKeyDown={(keyboardEvent) => onCellKeyDown(event, 'notes', keyboardEvent)}
        >
          {isCellActive('notes') ? (
            <InlineInput
              autoFocus
              type="text"
              value={rowDraft.notes}
              onChange={(inputEvent) => onCellValueChange(event, 'notes', inputEvent.target.value)}
            />
          ) : (
            <ReadOnlyClamp value={rowDraft.notes || event.notes} />
          )}
        </TableDetailEditableCell>
      </td>

      <td className={BASE_CELL_CLASSNAME}>
        <TableDetailEditableCell
          active={isCellActive('status')}
          className="ui-table-cell-status"
          columnKey="status"
          editable={editable}
          hasError={isCellError('status')}
          isSaving={isCellSaving('status')}
          onActivate={() => onActivateCell(event, 'status')}
          onBlur={() => onCellBlur(event, 'status')}
          onKeyDown={(keyboardEvent) => onCellKeyDown(event, 'status', keyboardEvent)}
        >
          {isCellActive('status') ? (
            <InlineStatusEditor
              autoFocus
              draft={rowDraft}
              onDraftChange={(nextValue) => onCellValueChange(event, 'status', nextValue)}
            />
          ) : (
            <StatusBadgeList
              artiaLaunched={Boolean(rowDraft.artiaLaunched)}
              syncPresentation={syncPresentation}
              endEstimated={event.endEstimated}
              workplace={rowDraft.workplace || event.workplace}
            />
          )}
        </TableDetailEditableCell>
      </td>

      <td className={`${BASE_CELL_CLASSNAME} text-xs text-slate-600 dark:text-slate-300`}>
        <RemoteEntrySummary event={event} />
      </td>

      <td className={`${BASE_CELL_CLASSNAME} text-slate-600 dark:text-slate-300`}>
        <ReadOnlyClamp value={computedActivityId} />
      </td>
    </tr>
  );
}

function areEqual(prevProps, nextProps) {
  return prevProps.event === nextProps.event
    && prevProps.rowDraft === nextProps.rowDraft
    && prevProps.activeColumnKey === nextProps.activeColumnKey
    && prevProps.savingColumns === nextProps.savingColumns
    && prevProps.errorColumns === nextProps.errorColumns
    && prevProps.dailyDetailsByDate === nextProps.dailyDetailsByDate
    && prevProps.isRowPending === nextProps.isRowPending
    && prevProps.minutesByDay === nextProps.minutesByDay
    && prevProps.projects === nextProps.projects
    && prevProps.onActivateCell === nextProps.onActivateCell
    && prevProps.onCellBlur === nextProps.onCellBlur
    && prevProps.onCellKeyDown === nextProps.onCellKeyDown
    && prevProps.onCellValueChange === nextProps.onCellValueChange
    && prevProps.onSelectEvent === nextProps.onSelectEvent
    && prevProps.onSelectRemoteEntry === nextProps.onSelectRemoteEntry;
}

export default memo(TableDetailRow, areEqual);
