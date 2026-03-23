import { Event } from '../../../domain/entities/Event.js';
import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

export class CreateEventUseCase {
  constructor(eventRepository, eventValidationService, accessibleProjectCatalogService, userReadProjectionService = null) {
    this.eventRepository = eventRepository;
    this.eventValidationService = eventValidationService;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute(data, userContext = {}) {
    const { start, end, day, project, activity, notes, artiaLaunched, workplace, userId } = data;
    const resolvedSelection = await this.accessibleProjectCatalogService.resolveEventSelection(userContext, {
      project,
      activity,
      activityLabel: data.activityLabel,
      activityId: data.activityId
    });

    const timeRange = new TimeRange(new Date(start), new Date(end), day);

    const event = new Event({
      id: this.generateId(),
      userId,
      timeRange,
      project: resolvedSelection.project.number,
      activity: resolvedSelection.activity,
      notes,
      artiaLaunched,
      workplace
    });

    const existingEvents = await this.eventRepository.findByDay(day, userId);
    
    this.eventValidationService.validateEvent(event, existingEvents);

    const createdEvent = await this.eventRepository.create(event);

    if (this.userReadProjectionService) {
      await this.userReadProjectionService.recomputeDaysForUser(userId, [day]);
    }

    return createdEvent.toJSON();
  }

  generateId() {
    return `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
