function buildError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeProjectNumber(value) {
  return String(value || '')
    .split(' - ')[0]
    .trim();
}

function normalizeActivityLabel(value) {
  return normalizeText(value).replace(/[\u2013\u2014]/g, '-');
}

function buildProjectKey(project) {
  return String(project?.key || project?.id || normalizeProjectNumber(project?.number) || 'sem-projeto').trim();
}

function buildActivityKey(project, activity) {
  const activityId = String(activity?.artiaId || activity?.id || '').trim();
  if (activityId) {
    return activityId;
  }

  return `${buildProjectKey(project)}::${normalizeActivityLabel(activity?.label || 'sem-atividade') || 'sem-atividade'}`;
}

export class AccessibleProjectCatalogService {
  constructor(integrationReadModelService, artiaProjectAccessService) {
    this.integrationReadModelService = integrationReadModelService;
    this.artiaProjectAccessService = artiaProjectAccessService;
  }

  findProjectInCatalog(projects, projectIdentifier) {
    const normalizedProjectIdentifier = normalizeProjectNumber(projectIdentifier);

    return projects.find((catalogProject) => (
      String(catalogProject.id) === String(projectIdentifier || '').trim()
      || String(catalogProject.key || '').trim() === String(projectIdentifier || '').trim()
      || normalizeProjectNumber(catalogProject.number) === normalizedProjectIdentifier
    )) || null;
  }

  findActivityInProject(project, payload) {
    const normalizedActivityLabel = normalizeActivityLabel(payload?.activityLabel || payload?.activity?.label);
    const activityIdHint = String(payload?.activity?.id || payload?.activityId || '').trim();

    if (!normalizedActivityLabel && !activityIdHint) {
      return null;
    }

    return (project?.activities || []).find((catalogActivity) => {
      if (activityIdHint && String(catalogActivity.key || '').trim() === activityIdHint) {
        return true;
      }

      if (normalizedActivityLabel && normalizeActivityLabel(catalogActivity.label) === normalizedActivityLabel) {
        return true;
      }

      if (activityIdHint && String(catalogActivity.artiaId || catalogActivity.id || '').trim() === activityIdHint) {
        return true;
      }

      return false;
    }) || null;
  }

  mapCatalogActivity(project, activity) {
    return {
      ...activity,
      key: buildActivityKey(project, activity),
      activityId: String(activity.artiaId || activity.id || '').trim()
    };
  }

  mapCatalogProject(project) {
    return {
      ...project,
      key: buildProjectKey(project),
      activities: (project.activities || []).map((activity) => this.mapCatalogActivity(project, activity))
    };
  }

  async getAccessibleProjectCatalog(user, options = {}) {
    const searchTerm = String(options.searchTerm || '').trim();
    const forceRefresh = options.forceRefresh;

    const [catalog, access] = await Promise.all([
      this.integrationReadModelService.getProjectCatalog({ forceRefresh }),
      this.artiaProjectAccessService.getAccessibleProjectIdsForUser(user, { forceRefresh })
    ]);

    if (!access?.projectIds?.length) {
      return [];
    }

    const allowedProjectIds = new Set(access.projectIds.map((projectId) => String(projectId)));
    const accessibleProjects = (catalog || [])
      .filter((project) => allowedProjectIds.has(String(project.id)))
      .map((project) => this.mapCatalogProject(project));

    if (!searchTerm) {
      return accessibleProjects;
    }

    const normalizedSearchTerm = normalizeText(searchTerm);
    return accessibleProjects.filter((project) => {
      const number = normalizeText(project.number);
      const name = normalizeText(project.name);
      return number.includes(normalizedSearchTerm) || name.includes(normalizedSearchTerm);
    });
  }

  async getAccessibleProjectActivities(user, projectId, options = {}) {
    const projects = await this.getAccessibleProjectCatalog(user, options);
    const project = this.findProjectInCatalog(projects, projectId);
    return project?.activities || [];
  }

  async decorateEventsWithCatalogAccess(events, user, options = {}) {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    const projects = await this.getAccessibleProjectCatalog(user, options);
    const accessibleProjectNumbers = new Set(
      projects.map((project) => normalizeProjectNumber(project.number))
    );

    return events.map((event) => {
      const projectNumber = normalizeProjectNumber(event.project);
      const hasProjectAccess = accessibleProjectNumbers.has(projectNumber);

      return {
        ...event,
        hasProjectAccess
      };
    });
  }

  async ensureEventProjectAccessible(user, projectNumber, options = {}) {
    const projects = await this.getAccessibleProjectCatalog(user, options);
    const project = this.findProjectInCatalog(projects, projectNumber);

    if (!project) {
      throw buildError('Projeto fora do acesso atual do usuario no Artia.', 403);
    }

    return project;
  }

  async resolveEventSelection(user, payload, options = {}) {
    const normalizedProjectNumber = normalizeProjectNumber(payload?.project);
    if (!normalizedProjectNumber) {
      throw buildError('Projeto e obrigatorio.', 400);
    }

    const activityLabel = String(payload?.activityLabel || payload?.activity?.label || '').trim();
    const activityIdHint = String(payload?.activity?.id || payload?.activityId || '').trim();
    if (!activityLabel && !activityIdHint) {
      throw buildError('Atividade e obrigatoria.', 400);
    }

    const project = await this.ensureEventProjectAccessible(user, normalizedProjectNumber, options);
    const activity = this.findActivityInProject(project, payload);

    if (!activity) {
      throw buildError('Atividade fora do projeto selecionado ou indisponivel no Artia.', 400);
    }

    const activityId = String(activity.artiaId || activity.id || '').trim();
    if (!activityId) {
      throw buildError('Atividade sem ID Artia resolvido automaticamente.', 400);
    }

    return {
      project,
      activity: {
        id: activityId,
        label: activity.label
      }
    };
  }
}
