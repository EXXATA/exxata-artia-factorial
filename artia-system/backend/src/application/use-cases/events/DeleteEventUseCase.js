export class DeleteEventUseCase {
  constructor(eventRepository, userReadProjectionService = null) {
    this.eventRepository = eventRepository;
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute(eventId, userId) {
    const event = await this.eventRepository.findById(eventId, userId);

    if (!event) {
      throw new Error('Event not found');
    }

    const affectedDay = event.timeRange.day;
    await this.eventRepository.delete(eventId, userId);

    if (this.userReadProjectionService) {
      await this.userReadProjectionService.recomputeDaysForUser(userId, [affectedDay]);
    }

    return { success: true, message: 'Event deleted successfully' };
  }
}
