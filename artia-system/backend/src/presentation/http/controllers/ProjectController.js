export class ProjectController {
  constructor(importProjectsUseCase, searchProjectsUseCase, projectRepository, accessibleProjectCatalogService) {
    this.importProjectsUseCase = importProjectsUseCase;
    this.searchProjectsUseCase = searchProjectsUseCase;
    this.projectRepository = projectRepository;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
  }

  async import(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const result = await this.importProjectsUseCase.execute(req.file.buffer);

      res.status(200).json({
        success: true,
        message: `Successfully imported ${result.imported} projects`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const projects = await this.accessibleProjectCatalogService.getAccessibleProjectCatalog(req.user, {
        forceRefresh: req.query.refresh
      });

      res.status(200).json({
        success: true,
        data: projects,
        count: projects.length
      });
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { q } = req.query;

      const searchTerm = String(q || '').trim().toLowerCase();
      const filteredProjects = await this.accessibleProjectCatalogService.getAccessibleProjectCatalog(req.user, {
        searchTerm,
        forceRefresh: req.query.refresh
      });

      res.status(200).json({
        success: true,
        data: filteredProjects,
        count: filteredProjects.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivities(req, res, next) {
    try {
      const { id } = req.params;

      const activities = await this.accessibleProjectCatalogService.getAccessibleProjectActivities(req.user, id, {
        forceRefresh: req.query.refresh
      });

      res.status(200).json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }
}
