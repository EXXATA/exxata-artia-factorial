export class DeleteEventUseCase {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId, userId) {
    const event = await this.eventRepository.findById(eventId, userId);

    if (!event) {
      throw new Error('Event not found');
    }

    await this.eventRepository.delete(eventId, userId);

    return { success: true, message: 'Event deleted successfully' };
  }
}
