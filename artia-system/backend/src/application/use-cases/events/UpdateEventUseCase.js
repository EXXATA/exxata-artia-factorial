import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

export class UpdateEventUseCase {
  constructor(eventRepository, eventValidationService) {
    this.eventRepository = eventRepository;
    this.eventValidationService = eventValidationService;
  }

  async execute(eventId, data, userId) {
    const existingEvent = await this.eventRepository.findById(eventId, userId);

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    if (data.start && data.end && data.day) {
      const timeRange = new TimeRange(new Date(data.start), new Date(data.end), data.day);
      existingEvent.updateTimeRange(timeRange);
    }

    if (data.project) {
      existingEvent.updateProject(data.project);
    }

    if (data.activity) {
      existingEvent.updateActivity(data.activity);
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

    return updatedEvent.toJSON();
  }
}
