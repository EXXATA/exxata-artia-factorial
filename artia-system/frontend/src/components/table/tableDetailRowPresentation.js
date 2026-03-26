import { combineDayAndTime } from '../../utils/eventViewUtils.js';
import { getArtiaSyncPresentation } from '../../utils/artiaSyncUtils.js';
import { calculateDuration } from '../../utils/timeUtils.js';
import {
  buildInlineDraft,
  canEditTableRow,
  findActivityByLabel,
  findProjectByNumber
} from './tableEditingUtils.js';

export function getInlineEffortMinutes(editingDraft) {
  if (!editingDraft?.day || !editingDraft?.startTime || !editingDraft?.endTime) {
    return 0;
  }

  const duration = calculateDuration(
    combineDayAndTime(editingDraft.day, editingDraft.startTime),
    combineDayAndTime(editingDraft.day, editingDraft.endTime)
  );

  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

export function getStatusPresentation(event, isDraftRow) {
  if (isDraftRow) {
    return {
      label: 'Novo',
      badgeClassName: 'border-sky-400/30 bg-sky-500/10 text-sky-100'
    };
  }

  if (event.rowType === 'system') {
    return getArtiaSyncPresentation(event.artiaSyncStatus);
  }

  return {
    label: 'Somente Artia',
    badgeClassName: 'border-violet-400/30 bg-violet-500/10 text-violet-100'
  };
}

export function buildTableDetailRowPresentation({
  event,
  rowDraft: rowDraftProp = null,
  dailyDetailsByDate = {},
  minutesByDay = {},
  projects = [],
  isRowPending = false
}) {
  const isDraftRow = event.rowType === 'draft';
  const editable = (canEditTableRow(event) || isDraftRow) && !(isDraftRow && isRowPending);
  const rowDraft = rowDraftProp || buildInlineDraft({
    row: event,
    fallbackDay: event.day
  });
  const selectedProject = findProjectByNumber(projects, rowDraft.project);
  const selectedActivity = findActivityByLabel(selectedProject, rowDraft.activityLabel);
  const draftDay = rowDraft.day || event.day;
  const dayComparison = dailyDetailsByDate[draftDay] || null;
  const syncPresentation = getStatusPresentation(event, isDraftRow);
  const effortMinutes = rowDraft ? getInlineEffortMinutes(rowDraft) : event.effortMinutes;
  const baseEffortMinutes = isDraftRow ? 0 : (event.effortMinutes || calculateDuration(event.start, event.end));
  const rowDayMinutes = editable
    ? ((minutesByDay[draftDay] || 0) + effortMinutes - (draftDay === event.day ? baseEffortMinutes : 0))
    : Math.round((dayComparison?.artiaHours || 0) * 60);
  const computedActivityId = selectedActivity
    ? String(selectedActivity.artiaId || selectedActivity.id || '').trim()
    : (event.activityId || '-');

  return {
    isDraftRow,
    editable,
    rowDraft,
    selectedProject,
    selectedActivity,
    draftDay,
    dayComparison,
    syncPresentation,
    effortMinutes,
    baseEffortMinutes,
    rowDayMinutes,
    computedActivityId
  };
}
