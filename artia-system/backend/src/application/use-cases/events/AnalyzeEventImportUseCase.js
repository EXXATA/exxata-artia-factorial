export class AnalyzeEventImportUseCase {
  constructor(eventImportEngine, eventRepository, accessibleProjectCatalogService) {
    this.eventImportEngine = eventImportEngine;
    this.eventRepository = eventRepository;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
  }

  async execute({ buffer, fileName, mapping = {}, user }) {
    const accessibleProjects = await this.accessibleProjectCatalogService.getAccessibleProjectCatalog(user);
    const existingEvents = await this.eventRepository.findAll({ userId: user.id });

    return this.eventImportEngine.analyze({
      buffer,
      fileName,
      mapping,
      accessibleProjects,
      existingEvents: existingEvents.map((event) => event.toJSON ? event.toJSON() : event)
    });
  }
}
