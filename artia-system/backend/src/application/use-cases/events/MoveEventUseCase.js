import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

export class MoveEventUseCase {
  constructor(eventRepository, eventValidationService) {
    this.eventRepository = eventRepository;
    this.eventValidationService = eventValidationService;
  }

  async execute(eventId, newStart, newEnd, newDay, userId) {
    const event = await this.eventRepository.findById(eventId, userId);

    if (!event) {
      throw new Error('Event not found');
    }

    const newTimeRange = new TimeRange(new Date(newStart), new Date(newEnd), newDay);
    event.updateTimeRange(newTimeRange);

    const eventsOnDay = await this.eventRepository.findByDay(newDay, userId);
    this.eventValidationService.validateEvent(event, eventsOnDay);

    const updatedEvent = await this.eventRepository.update(eventId, event, userId);

    return updatedEvent.toJSON();
  }
}
