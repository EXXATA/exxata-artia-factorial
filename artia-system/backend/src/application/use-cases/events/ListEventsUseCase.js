export class ListEventsUseCase {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(filters, userId) {
    const { startDate, endDate, project, day } = filters;

    let events;

    if (day) {
      events = await this.eventRepository.findByDay(day, userId);
    } else if (startDate && endDate) {
      events = await this.eventRepository.findByDateRange(startDate, endDate, userId);
    } else if (project) {
      events = await this.eventRepository.findByProject(project, userId);
    } else {
      events = await this.eventRepository.findAll({ userId });
    }

    if (project) {
      events = events.filter(event => String(event.project) === String(project));
    }

    return events.map(event => event.toJSON());
  }
}
