import { combineDayAndTime, extractTimeValue, normalizeProjectInput } from '../../utils/eventViewUtils.js';

/**
 * @typedef {Object} EditableTableRow
 * @property {string} id
 * @property {'system'|'artia_only'|'draft'} rowType
 * @property {string} day
 * @property {string} [start]
 * @property {string} [end]
 * @property {string} [project]
 * @property {string} [activityLabel]
 * @property {string} [activityId]
 * @property {string} [notes]
 * @property {boolean} [artiaLaunched]
 * @property {string|null} [workplace]
 * @property {boolean} [hasProjectAccess]
 */

/**
 * @typedef {Object} InlineDraft
 * @property {string} day
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} project
 * @property {string} activityLabel
 * @property {string} notes
 * @property {boolean} artiaLaunched
 * @property {string} workplace
 */

export const DEFAULT_INLINE_START_TIME = '08:00';
export const DEFAULT_INLINE_END_TIME = '08:50';
export const WORKPLACE_OPTIONS = ['Escritorio', 'Casa', 'Cliente'];

export function canEditTableRow(row) {
  return row?.rowType === 'system' && row?.hasProjectAccess !== false;
}

export function updateDraftProject(draft, nextProject) {
  return {
    ...draft,
    project: normalizeProjectInput(nextProject),
    activityLabel: ''
  };
}

export function buildInlineDraft({ row = null, fallbackDay = '' } = {}) {
  return {
    day: row?.day || fallbackDay || '',
    startTime: row?.start ? extractTimeValue(row.start, row.day) : DEFAULT_INLINE_START_TIME,
    endTime: row?.end ? extractTimeValue(row.end, row.day) : DEFAULT_INLINE_END_TIME,
    project: normalizeProjectInput(row?.project || ''),
    activityLabel: row?.activityLabel || '',
    notes: row?.notes || '',
    artiaLaunched: Boolean(row?.artiaLaunched),
    workplace: row?.workplace || ''
  };
}

export function buildInlineDraftRow(draft) {
  if (!draft) {
    return null;
  }

  return {
    id: 'draft-inline',
    rowType: 'draft',
    day: draft.day,
    start: combineDayAndTime(draft.day, draft.startTime),
    end: combineDayAndTime(draft.day, draft.endTime),
    effortMinutes: 0,
    project: normalizeProjectInput(draft.project),
    activityLabel: draft.activityLabel || '',
    activityId: '',
    notes: draft.notes || '',
    artiaLaunched: Boolean(draft.artiaLaunched),
    workplace: draft.workplace || '',
    hasProjectAccess: true
  };
}

export function findProjectByNumber(projects, projectNumber) {
  return (projects || []).find(
    (project) => String(project.number) === String(normalizeProjectInput(projectNumber))
  ) || null;
}

export function findActivityByLabel(project, activityLabel) {
  return (project?.activities || []).find((activity) => (
    activity.label.trim().toLowerCase() === String(activityLabel || '').trim().toLowerCase()
  )) || null;
}

export function buildInlineEventPayload(draft, selectedProject, selectedActivity) {
  const payload = {
    start: combineDayAndTime(draft.day, draft.startTime),
    end: combineDayAndTime(draft.day, draft.endTime),
    day: draft.day,
    project: selectedProject.number,
    activity: {
      id: String(selectedActivity?.artiaId || selectedActivity?.id || '').trim(),
      label: selectedActivity.label
    },
    notes: draft.notes || '',
    artiaLaunched: Boolean(draft.artiaLaunched)
  };

  if (draft.workplace) {
    payload.workplace = draft.workplace;
  }

  return payload;
}

export function getPreferredInlineDay({ startDate, endDate, todayIso }) {
  if (todayIso && todayIso >= startDate && todayIso <= endDate) {
    return todayIso;
  }

  return startDate;
}
