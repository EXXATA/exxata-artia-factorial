import { combineDayAndTime } from '../../utils/eventViewUtils.js';
import { buildInlineEventPayload, buildInlineDraft, canEditTableRow, findActivityByLabel, findProjectByNumber, updateDraftProject } from './tableEditingUtils.js';

export const EDITABLE_TABLE_CELL_ORDER = Object.freeze([
  'day',
  'project',
  'startTime',
  'endTime',
  'activityLabel',
  'notes',
  'status'
]);

const TIME_COMMIT_FIELDS = Object.freeze(['day', 'startTime', 'endTime']);
const PROJECT_COMMIT_FIELDS = Object.freeze(['project', 'activityLabel']);
const STATUS_COMMIT_FIELDS = Object.freeze(['artiaLaunched', 'workplace']);

const CELL_COMMIT_FIELDS = Object.freeze({
  day: TIME_COMMIT_FIELDS,
  project: PROJECT_COMMIT_FIELDS,
  startTime: TIME_COMMIT_FIELDS,
  endTime: TIME_COMMIT_FIELDS,
  activityLabel: PROJECT_COMMIT_FIELDS,
  notes: ['notes'],
  status: STATUS_COMMIT_FIELDS
});

export function applyCellDraftChange(draft, columnKey, nextValue) {
  if (!draft) {
    return draft;
  }

  if (columnKey === 'project') {
    return updateDraftProject(draft, nextValue);
  }

  if (columnKey === 'status') {
    return {
      ...draft,
      artiaLaunched: Boolean(nextValue?.artiaLaunched),
      workplace: nextValue?.workplace || ''
    };
  }

  return {
    ...draft,
    [columnKey]: nextValue
  };
}

function getEditableRows(rows = []) {
  return rows.filter((row) => row?.rowType === 'draft' || canEditTableRow(row));
}

export function getNextActiveCell({ rows = [], activeCell = null, direction = 'horizontal' }) {
  if (!activeCell?.rowId || !activeCell?.columnKey) {
    return null;
  }

  const editableRows = getEditableRows(rows);
  const rowIndex = editableRows.findIndex((row) => row.id === activeCell.rowId);
  const columnIndex = EDITABLE_TABLE_CELL_ORDER.indexOf(activeCell.columnKey);

  if (rowIndex === -1 || columnIndex === -1) {
    return null;
  }

  if (direction === 'vertical') {
    const nextRow = editableRows[rowIndex + 1];
    return nextRow
      ? { rowId: nextRow.id, columnKey: activeCell.columnKey }
      : null;
  }

  const nextColumn = EDITABLE_TABLE_CELL_ORDER[columnIndex + 1];
  return nextColumn
    ? { rowId: activeCell.rowId, columnKey: nextColumn }
    : null;
}

export function getCellNavigationIntent(key) {
  if (key === 'Tab') {
    return 'horizontal';
  }

  if (key === 'Enter') {
    return 'vertical';
  }

  if (key === 'Escape') {
    return 'close';
  }

  return null;
}

function hasValidTimeRange(payload) {
  if (!payload?.start || !payload?.end) {
    return false;
  }

  return new Date(payload.end) > new Date(payload.start);
}

function buildTimePayload(draft) {
  return {
    start: combineDayAndTime(draft.day, draft.startTime),
    end: combineDayAndTime(draft.day, draft.endTime),
    day: draft.day
  };
}

function buildDraftCreatePlan({ draft, projects, committedFields }) {
  const selectedProject = findProjectByNumber(projects, draft.project);
  if (!selectedProject) {
    return {
      type: 'defer',
      reason: 'draft_not_ready',
      committedFields
    };
  }

  const selectedActivity = findActivityByLabel(selectedProject, draft.activityLabel);
  if (!selectedActivity) {
    return {
      type: 'defer',
      reason: 'awaiting_activity_selection',
      committedFields
    };
  }

  const payload = buildInlineEventPayload(draft, selectedProject, selectedActivity);
  if (!hasValidTimeRange(payload)) {
    return {
      type: 'defer',
      reason: 'time_range_invalid',
      committedFields
    };
  }

  return {
    type: 'create',
    payload,
    committedFields
  };
}

export function buildCellCommitPlan({ row, columnKey, draft, projects = [] }) {
  const committedFields = CELL_COMMIT_FIELDS[columnKey] || [columnKey];

  if (!draft) {
    return {
      type: 'defer',
      reason: 'missing_draft',
      committedFields
    };
  }

  const timePayload = buildTimePayload(draft);
  if (columnKey === 'day' || columnKey === 'startTime' || columnKey === 'endTime') {
    if (!hasValidTimeRange(timePayload)) {
      return {
        type: 'defer',
        reason: 'time_range_invalid',
        committedFields
      };
    }

    if (row?.rowType === 'draft') {
      return buildDraftCreatePlan({ draft, projects, committedFields });
    }

    return {
      type: 'update',
      payload: timePayload,
      committedFields
    };
  }

  if (columnKey === 'notes') {
    if (row?.rowType === 'draft') {
      return buildDraftCreatePlan({ draft, projects, committedFields });
    }

    return {
      type: 'update',
      payload: { notes: draft.notes || '' },
      committedFields
    };
  }

  if (columnKey === 'status') {
    if (row?.rowType === 'draft') {
      return buildDraftCreatePlan({ draft, projects, committedFields });
    }

    return {
      type: 'update',
      payload: {
          artiaLaunched: Boolean(draft.artiaLaunched),
          workplace: draft.workplace || null
      },
      committedFields
    };
  }

  const selectedProject = findProjectByNumber(projects, draft.project);

  if (!selectedProject) {
    return {
      type: 'defer',
      reason: row?.rowType === 'draft' ? 'draft_not_ready' : 'selection_invalid',
      committedFields
    };
  }

  const selectedActivity = findActivityByLabel(selectedProject, draft.activityLabel);
  if (!selectedActivity) {
    return {
      type: 'defer',
      reason: 'awaiting_activity_selection',
      committedFields
    };
  }

  if (row?.rowType !== 'draft') {
    return {
      type: 'update',
      payload: {
        project: selectedProject.number,
        activity: {
          id: String(selectedActivity?.artiaId || selectedActivity?.id || '').trim(),
          label: selectedActivity.label
        }
      },
      committedFields
    };
  }

  return buildDraftCreatePlan({ draft, projects, committedFields });
}

export function shouldSkipDraftCommitForSelectionFlow({ row, columnKey, queuedActivation }) {
  if (row?.rowType !== 'draft' || queuedActivation?.rowId !== row?.id) {
    return false;
  }

  if (columnKey === 'activityLabel') {
    return queuedActivation.columnKey === 'startTime' || queuedActivation.columnKey === 'endTime';
  }

  return columnKey === 'startTime' && queuedActivation.columnKey === 'endTime';
}

export function getPersistedDraftForRow(row) {
  return buildInlineDraft({
    row,
    fallbackDay: row?.day || ''
  });
}
