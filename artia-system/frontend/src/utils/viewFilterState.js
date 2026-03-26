export function getActiveViewFilterValue(value) {
  return value && value !== 'ALL' ? value : undefined;
}

function hasOptionKey(options = [], value) {
  return (options || []).some((option) => String(option.key) === String(value));
}

export function reconcileProjectFilter(projectFilter, projectOptions = []) {
  if (projectFilter === 'ALL') {
    return 'ALL';
  }

  return hasOptionKey(projectOptions, projectFilter) ? projectFilter : 'ALL';
}

export function reconcileProjectAndActivityFilters({
  projectFilter,
  activityFilter,
  projectOptions = [],
  activityOptions = []
} = {}) {
  const nextProjectFilter = reconcileProjectFilter(projectFilter, projectOptions);

  if (nextProjectFilter === 'ALL') {
    return {
      projectFilter: 'ALL',
      activityFilter: 'ALL'
    };
  }

  return {
    projectFilter: nextProjectFilter,
    activityFilter: hasOptionKey(activityOptions, activityFilter) ? activityFilter : 'ALL'
  };
}
