export const VIEW_QUERY_STALE_MS = 5 * 60 * 1000;

export function buildViewUserScopeKey(user) {
  return user?.id || user?.email || 'anonymous';
}

export function getWeekViewQueryKey(userScopeKey, {
  startDate,
  endDate,
  projectKey,
  activityKey
} = {}) {
  return ['views', 'week', userScopeKey, startDate || null, endDate || null, projectKey || null, activityKey || null];
}

export function getRangeSummaryQueryKey(userScopeKey, {
  startDate,
  endDate,
  projectKey,
  activityKey
} = {}) {
  return ['views', 'range-summary', userScopeKey, startDate || null, endDate || null, projectKey || null, activityKey || null];
}
