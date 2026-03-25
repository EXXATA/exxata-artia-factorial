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
  return uniqBy((availableProjects || []).map((project, index) => ({
    key: String(project.key || project.id || project.number || `project-${index}`),
    id: String(project.id || project.key || project.number || `project-${index}`),
    number: String(project.number || project.projectNumber || project.id || project.key || `project-${index}`),
    name: String(project.name || project.projectName || ''),
    label: formatProjectOptionLabel(project)
  })), (project) => project.number);
}

export function normalizeAvailableActivityOptions(availableActivities = [], projectOptions = [], selectedProject = 'ALL') {
  const selectedProjectKeys = new Set(
    projectOptions
      .filter((project) => selectedProject === 'ALL' || String(project.number) === String(selectedProject))
      .map((project) => String(project.key))
  );

  return uniqBy((availableActivities || [])
    .map((activity, index) => ({
      key: String(activity.key || activity.activityId || activity.activityLabel || `activity-${index}`),
      projectKey: String(activity.projectKey || ''),
      activityId: activity.activityId ? String(activity.activityId) : '',
      label: String(activity.activityLabel || activity.label || 'Sem atividade'),
      value: String(activity.activityId || activity.activityLabel || activity.label || `activity-${index}`)
    }))
    .filter((activity) => selectedProject === 'ALL' || selectedProjectKeys.has(activity.projectKey)), (activity) => activity.key);
}

export function normalizeProjectCatalogOptions(projects = []) {
  return normalizeAvailableProjectOptions(projects);
}

export function normalizeProjectCatalogActivityOptions(projects = [], selectedProject = 'ALL') {
  const visibleProjects = (projects || []).filter((project) => (
    selectedProject === 'ALL' || String(project.number) === String(selectedProject)
  ));

  return uniqBy(visibleProjects.flatMap((project, projectIndex) => (
    (project.activities || []).map((activity, activityIndex) => ({
      key: String(
        activity.artiaId
        || activity.id
        || `${project.number || project.id || projectIndex}:${activity.label || activityIndex}`
      ),
      projectKey: String(project.id || project.key || project.number || `project-${projectIndex}`),
      activityId: activity.artiaId ? String(activity.artiaId) : String(activity.id || ''),
      label: String(activity.label || activity.activityLabel || 'Sem atividade'),
      value: String(activity.artiaId || activity.id || activity.label || `activity-${projectIndex}-${activityIndex}`)
    }))
  )), (activity) => activity.value);
}
