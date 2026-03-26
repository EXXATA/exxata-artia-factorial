import { combineDayAndTime, normalizeProjectInput } from '../../utils/eventViewUtils.js';
import { calculateDuration } from '../../utils/timeUtils.js';
import { findActivityByLabel, findProjectByNumber } from './tableEditingUtils.js';

function includesAny(committedFields, expectedFields) {
  return expectedFields.some((field) => committedFields.includes(field));
}

export function buildOptimisticRowFromDraft({
  row,
  draft,
  committedFields = [],
  projects = [],
  nextRowId = row?.id
}) {
  if (!draft) {
    return null;
  }

  const isDraftRow = row?.rowType === 'draft';
  const shouldApplyTime = isDraftRow || includesAny(committedFields, ['day', 'startTime', 'endTime']);
  const shouldApplyProject = isDraftRow || includesAny(committedFields, ['project', 'activityLabel']);
  const shouldApplyNotes = isDraftRow || committedFields.includes('notes');
  const shouldApplyStatus = isDraftRow || includesAny(committedFields, ['artiaLaunched', 'workplace']);

  const nextRow = {
    ...(isDraftRow ? {} : row),
    id: nextRowId || row?.id,
    rowType: 'system',
    day: row?.day || draft.day || '',
    start: row?.start || '',
    end: row?.end || '',
    project: normalizeProjectInput(row?.project || draft.project || ''),
    activityId: row?.activityId || '',
    activityLabel: row?.activityLabel || '',
    notes: row?.notes || '',
    artiaLaunched: Boolean(row?.artiaLaunched),
    workplace: row?.workplace ?? null,
    hasProjectAccess: row?.hasProjectAccess !== false
  };

  if (shouldApplyTime) {
    nextRow.day = draft.day || nextRow.day;
    nextRow.start = combineDayAndTime(nextRow.day, draft.startTime);
    nextRow.end = combineDayAndTime(nextRow.day, draft.endTime);
  }

  if (shouldApplyProject) {
    const selectedProject = findProjectByNumber(projects, draft.project);
    const selectedActivity = findActivityByLabel(selectedProject, draft.activityLabel);

    nextRow.project = selectedProject?.number || normalizeProjectInput(draft.project);
    nextRow.activityId = selectedActivity
      ? String(selectedActivity.artiaId || selectedActivity.id || '').trim()
      : '';
    nextRow.activityLabel = selectedActivity?.label || draft.activityLabel || '';
  }

  if (shouldApplyNotes) {
    nextRow.notes = draft.notes || '';
  }

  if (shouldApplyStatus) {
    nextRow.artiaLaunched = Boolean(draft.artiaLaunched);
    nextRow.workplace = draft.workplace || null;
  }

  nextRow.effortMinutes = calculateDuration(nextRow.start, nextRow.end);

  return nextRow;
}
