export class EventController {
  constructor(
    createEventUseCase,
    updateEventUseCase,
    deleteEventUseCase,
    listEventsUseCase,
    moveEventUseCase,
    importLegacyEventsUseCase,
    integrationReadModelService,
    accessibleProjectCatalogService
  ) {
    this.createEventUseCase = createEventUseCase;
    this.updateEventUseCase = updateEventUseCase;
    this.deleteEventUseCase = deleteEventUseCase;
    this.listEventsUseCase = listEventsUseCase;
    this.moveEventUseCase = moveEventUseCase;
    this.importLegacyEventsUseCase = importLegacyEventsUseCase;
    this.integrationReadModelService = integrationReadModelService;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
  }

  async create(req, res, next) {
    try {
      const userId = req.user.id;
      const eventData = { ...req.body, userId };

      const event = await this.createEventUseCase.execute(eventData, req.user);

      res.status(201).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const userId = req.user.id;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        project: req.query.project,
        day: req.query.day
      };

      const events = await this.listEventsUseCase.execute(filters, userId);

      const enrichedEvents = await this.integrationReadModelService.decorateEventsWithSyncStatus(events, {
        id: req.user.id,
        email: req.user.email,
        artiaUserId: req.user.artiaUserId,
        factorialEmployeeId: req.user.factorialEmployeeId
      }, {
        startDate: filters.day || filters.startDate,
        endDate: filters.day || filters.endDate,
        forceRefresh: req.query.refresh
      });
      const accessDecoratedEvents = await this.accessibleProjectCatalogService.decorateEventsWithCatalogAccess(
        enrichedEvents,
        req.user,
        { forceRefresh: req.query.refresh }
      );

      res.status(200).json({
        success: true,
        data: accessDecoratedEvents,
        count: accessDecoratedEvents.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const event = await this.listEventsUseCase.eventRepository.findById(id, userId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const [decoratedEvent] = await this.accessibleProjectCatalogService.decorateEventsWithCatalogAccess(
        [event.toJSON()],
        req.user
      );

      res.status(200).json({
        success: true,
        data: decoratedEvent
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const event = await this.updateEventUseCase.execute(id, updateData, req.user);

      res.status(200).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  async move(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { newStart, newEnd, newDay } = req.body;

      const event = await this.moveEventUseCase.execute(id, newStart, newEnd, newDay, req.user);

      res.status(200).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  async importLegacy(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const userId = req.user.id;
      const result = await this.importLegacyEventsUseCase.execute({
        buffer: req.file.buffer,
        userId,
        mode: req.body.mode
      });

      res.status(200).json({
        success: true,
        message: `Importação concluída. ${result.imported} eventos importados.`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await this.deleteEventUseCase.execute(id, userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}
