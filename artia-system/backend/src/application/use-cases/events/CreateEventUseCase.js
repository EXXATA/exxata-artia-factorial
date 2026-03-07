import { Event } from '../../../domain/entities/Event.js';
import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

export class CreateEventUseCase {
  constructor(eventRepository, eventValidationService) {
    this.eventRepository = eventRepository;
    this.eventValidationService = eventValidationService;
  }

  async execute(data) {
    const { start, end, day, project, activity, notes, artiaLaunched, workplace, userId } = data;

    const timeRange = new TimeRange(new Date(start), new Date(end), day);

    const event = new Event({
      id: this.generateId(),
      userId,
      timeRange,
      project,
      activity,
      notes,
      artiaLaunched,
      workplace
    });

    const existingEvents = await this.eventRepository.findByDay(day, userId);
    
    this.eventValidationService.validateEvent(event, existingEvents);

    const createdEvent = await this.eventRepository.create(event);

    return createdEvent.toJSON();
  }

  generateId() {
    return `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
