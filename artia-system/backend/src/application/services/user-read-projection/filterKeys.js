import { normalizeText } from './shared.js';

function normalizeKey(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function buildActivityKey(activityId, activityLabel, projectKey = '') {
  const normalizedActivityId = normalizeKey(activityId);
  if (normalizedActivityId) {
    return normalizedActivityId;
  }

  const normalizedLabel = normalizeText(activityLabel).replace(/\s+/g, '-');
  if (normalizeKey(projectKey)) {
    return `${normalizeKey(projectKey)}::${normalizedLabel || 'sem-atividade'}`;
  }

  return normalizedLabel || 'sem-atividade';
}

export function resolveActivityKey(payload = {}) {
  return normalizeKey(payload.activityKey)
    || buildActivityKey(payload.activityId, payload.activityLabel || payload.activity, payload.projectKey);
}

export function matchesProjectFilter(projectKey, payload = {}) {
  const normalizedProjectKey = normalizeKey(projectKey);
  if (!normalizedProjectKey) {
    return true;
  }

  return normalizeKey(payload.projectKey) === normalizedProjectKey;
}

export function matchesActivityFilter(activityKey, payload = {}) {
  const normalizedActivityKey = normalizeKey(activityKey);
  if (!normalizedActivityKey) {
    return true;
  }

  return resolveActivityKey(payload) === normalizedActivityKey;
}

export function normalizeViewFilterOptions(options = {}) {
  return {
    ...options,
    projectKey: normalizeKey(options.projectKey),
    activityKey: normalizeKey(options.activityKey)
  };
}
