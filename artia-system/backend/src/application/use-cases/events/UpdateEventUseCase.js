import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

export class UpdateEventUseCase {
  constructor(eventRepository, eventValidationService, accessibleProjectCatalogService, userReadProjectionService = null) {
    this.eventRepository = eventRepository;
    this.eventValidationService = eventValidationService;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute(eventId, data, userContext) {
    const userId = typeof userContext === 'string' ? userContext : userContext?.id;
    const existingEvent = await this.eventRepository.findById(eventId, userId);

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    const originalDay = existingEvent.timeRange.day;
    await this.accessibleProjectCatalogService.ensureEventProjectAccessible(userContext, existingEvent.project);

    if (data.start && data.end && data.day) {
      const timeRange = new TimeRange(new Date(data.start), new Date(data.end), data.day);
      existingEvent.updateTimeRange(timeRange);
    }

    if (data.project || data.activity || data.activityLabel || data.activityId) {
      const resolvedSelection = await this.accessibleProjectCatalogService.resolveEventSelection(userContext, {
        project: data.project || existingEvent.project,
        activity: data.activity || existingEvent.activity,
        activityLabel: data.activityLabel || existingEvent.activity?.label,
        activityId: data.activityId
      });

      existingEvent.updateProject(resolvedSelection.project.number);
      existingEvent.updateActivity(resolvedSelection.activity);
    }

    if (data.notes !== undefined) {
      existingEvent.updateNotes(data.notes);
    }

    if (data.artiaLaunched !== undefined) {
      if (data.artiaLaunched !== existingEvent.artiaLaunched) {
        existingEvent.toggleArtiaLaunched();
      }
    }

    if (data.workplace !== undefined) {
      existingEvent.setWorkplace(data.workplace);
    }

    const eventsOnDay = await this.eventRepository.findByDay(existingEvent.timeRange.day, userId);
    this.eventValidationService.validateEvent(existingEvent, eventsOnDay);

    const updatedEvent = await this.eventRepository.update(eventId, existingEvent, userId);

    if (this.userReadProjectionService) {
      await this.userReadProjectionService.recomputeDaysForUser(userId, [originalDay, existingEvent.timeRange.day]);
    }

    return updatedEvent.toJSON();
  }
}
