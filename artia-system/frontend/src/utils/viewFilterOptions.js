function uniqBy(items, getKey) {
  const seen = new Set();

  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeProjectOption(project, index) {
  const key = String(project?.key || project?.id || project?.number || `project-${index}`);

  return {
    key,
    value: key,
    id: String(project?.id || key),
    number: String(project?.number || project?.projectNumber || project?.id || key),
    name: String(project?.name || project?.projectName || ''),
    label: formatProjectOptionLabel(project)
  };
}

function normalizeActivityOption(activity, index, fallbackProjectKey = '') {
  const key = String(
    activity?.key
    || activity?.activityId
    || activity?.artiaId
    || activity?.id
    || activity?.activityLabel
    || activity?.label
    || `activity-${index}`
  );

  return {
    key,
    value: key,
    projectKey: String(activity?.projectKey || fallbackProjectKey || ''),
    activityId: activity?.activityId ? String(activity.activityId) : String(activity?.artiaId || activity?.id || ''),
    label: String(activity?.activityLabel || activity?.label || 'Sem atividade')
  };
}

export function formatProjectOptionLabel(project) {
  if (!project) {
    return 'Sem projeto';
  }

  if (project.label) {
    return project.label;
  }

  return [project.number, project.name].filter(Boolean).join(' - ') || String(project.number || project.id || 'Sem projeto');
}

export function normalizeAvailableProjectOptions(availableProjects = []) {
  return uniqBy(
    (availableProjects || []).map((project, index) => normalizeProjectOption(project, index)),
    (project) => project.key
  );
}

export function normalizeAvailableActivityOptions(availableActivities = [], selectedProjectKey = 'ALL') {
  return uniqBy(
    (availableActivities || [])
      .map((activity, index) => normalizeActivityOption(activity, index))
      .filter((activity) => selectedProjectKey === 'ALL' || String(activity.projectKey) === String(selectedProjectKey)),
    (activity) => activity.key
  );
}

export function normalizeProjectCatalogOptions(projects = []) {
  return normalizeAvailableProjectOptions(projects);
}

export function normalizeProjectCatalogActivityOptions(projects = [], selectedProjectKey = 'ALL') {
  const visibleProjects = (projects || []).filter((project) => (
    selectedProjectKey === 'ALL' || String(project.key || project.id || project.number) === String(selectedProjectKey)
  ));

  return uniqBy(
    visibleProjects.flatMap((project, projectIndex) => (
      (project.activities || []).map((activity, activityIndex) => normalizeActivityOption(
        activity,
        `${projectIndex}-${activityIndex}`,
        String(project.key || project.id || project.number || `project-${projectIndex}`)
      ))
    )),
    (activity) => activity.key
  );
}

export function mergeProjectFilterOptions({ catalogProjects = [], availableProjects = [] } = {}) {
  return uniqBy(
    [
      ...normalizeProjectCatalogOptions(catalogProjects),
      ...normalizeAvailableProjectOptions(availableProjects)
    ],
    (project) => project.key
  );
}

export function mergeActivityFilterOptions({
  catalogProjects = [],
  availableActivities = [],
  selectedProjectKey = 'ALL'
} = {}) {
  return uniqBy(
    [
      ...normalizeProjectCatalogActivityOptions(catalogProjects, selectedProjectKey),
      ...normalizeAvailableActivityOptions(availableActivities, selectedProjectKey)
    ],
    (activity) => activity.key
  );
}
