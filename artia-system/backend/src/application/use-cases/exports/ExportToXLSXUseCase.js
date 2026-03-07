export class ExportToXLSXUseCase {
  constructor(eventRepository, xlsxGenerator) {
    this.eventRepository = eventRepository;
    this.xlsxGenerator = xlsxGenerator;
  }

  async execute(filters, userId) {
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

    const xlsxBuffer = await this.xlsxGenerator.generate(events, {
      baseFileName: filters.baseFileName || ''
    });

    return {
      buffer: xlsxBuffer,
      filename: 'backup_artia.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }
}
