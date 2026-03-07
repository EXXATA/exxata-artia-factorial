export class ExportToCSVUseCase {
  constructor(eventRepository, csvGenerator) {
    this.eventRepository = eventRepository;
    this.csvGenerator = csvGenerator;
  }

  async execute(filters, email, userId) {
    const { startDate, endDate, project } = filters;

    let events;

    if (startDate && endDate) {
      events = await this.eventRepository.findByDateRange(startDate, endDate, userId);
    } else if (project) {
      events = await this.eventRepository.findByProject(project, userId);
    } else {
      events = await this.eventRepository.findAll({ userId });
    }

    events.sort((a, b) => new Date(a.timeRange.start) - new Date(b.timeRange.start));

    const csvBuffer = await this.csvGenerator.generate(events, email);

    return {
      buffer: csvBuffer,
      filename: 'apontamento_horas.csv',
      mimeType: 'text/csv;charset=utf-8'
    };
  }
}
