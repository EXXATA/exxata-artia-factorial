import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

export class MoveEventUseCase {
  constructor(eventRepository, eventValidationService, accessibleProjectCatalogService, userReadProjectionService = null) {
    this.eventRepository = eventRepository;
    this.eventValidationService = eventValidationService;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute(eventId, newStart, newEnd, newDay, userContext) {
    const userId = typeof userContext === 'string' ? userContext : userContext?.id;
    const event = await this.eventRepository.findById(eventId, userId);

    if (!event) {
      throw new Error('Event not found');
    }

    const originalDay = event.timeRange?.day || event.day || newDay;
    await this.accessibleProjectCatalogService.ensureEventProjectAccessible(userContext, event.project);

    const newTimeRange = new TimeRange(new Date(newStart), new Date(newEnd), newDay);
    event.updateTimeRange(newTimeRange);

    const eventsOnDay = await this.eventRepository.findByDay(newDay, userId);
    this.eventValidationService.validateEvent(event, eventsOnDay);

    const updatedEvent = await this.eventRepository.update(eventId, event, userId);

    if (this.userReadProjectionService) {
      await this.userReadProjectionService.recomputeDaysForUser(userId, [originalDay, newDay]);
    }

    return updatedEvent.toJSON();
  }
}
