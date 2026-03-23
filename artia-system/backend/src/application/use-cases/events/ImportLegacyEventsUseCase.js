import { Event } from '../../../domain/entities/Event.js';
import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

export class ImportLegacyEventsUseCase {
  constructor(eventRepository, legacyEventsXLSXParser, projectRepository, userReadProjectionService = null) {
    this.eventRepository = eventRepository;
    this.legacyEventsXLSXParser = legacyEventsXLSXParser;
    this.projectRepository = projectRepository;
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute({ buffer, userId, mode = 'merge' }) {
    const normalizedMode = mode === 'replace' ? 'replace' : 'merge';
    const parsedEvents = await this.legacyEventsXLSXParser.parse(buffer);
    const hydratedEvents = [];

    for (const parsedEvent of parsedEvents) {
      hydratedEvents.push(await this.createDomainEvent(parsedEvent, userId));
    }

    let replacedCount = 0;
    let skippedDuplicates = 0;
    const allExistingEvents = await this.eventRepository.findAll({ userId });
    let existingEvents = normalizedMode === 'replace' ? [] : allExistingEvents;

    if (normalizedMode === 'replace') {
      replacedCount = await this.eventRepository.deleteAllByUser(userId);
    }

    const existingSignatures = new Set(existingEvents.map(event => this.buildSignature(event.toJSON())));
    const importSignatures = new Set();
    const eventsToPersist = [];

    for (const event of hydratedEvents) {
      const payload = event.toJSON();
      const signature = this.buildSignature(payload);

      if (existingSignatures.has(signature) || importSignatures.has(signature)) {
        skippedDuplicates += 1;
        continue;
      }

      importSignatures.add(signature);
      eventsToPersist.push(event);
    }

    const persistedEvents = await this.eventRepository.bulkCreate(eventsToPersist);
    const affectedDays = Array.from(new Set([
      ...allExistingEvents.map((event) => event.timeRange.day),
      ...persistedEvents.map((event) => event.timeRange.day)
    ]));

    if (this.userReadProjectionService && affectedDays.length > 0) {
      await this.userReadProjectionService.recomputeDaysForUser(userId, affectedDays);
    }

    return {
      mode: normalizedMode,
      received: parsedEvents.length,
      imported: persistedEvents.length,
      skippedDuplicates,
      replacedCount,
      totalAfterImport: normalizedMode === 'replace'
        ? persistedEvents.length
        : existingEvents.length + persistedEvents.length
    };
  }

  async createDomainEvent(parsedEvent, userId) {
    const activityId = parsedEvent.activityId || await this.lookupActivityId(
      parsedEvent.project,
      parsedEvent.activityLabel
    );

    const timeRange = new TimeRange(
      new Date(parsedEvent.start),
      new Date(parsedEvent.end),
      parsedEvent.day
    );

    return new Event({
      id: this.generateId(),
      userId,
      timeRange,
      project: parsedEvent.project,
      activity: {
        id: activityId,
        label: parsedEvent.activityLabel
      },
      notes: parsedEvent.notes,
      artiaLaunched: parsedEvent.artiaLaunched
    });
  }

  async lookupActivityId(projectNumber, activityLabel) {
    if (!projectNumber || !activityLabel) {
      return '';
    }

    const project = await this.projectRepository.findByNumber(projectNumber);

    if (!project) {
      return '';
    }

    const normalizedLabel = this.normalizeKey(activityLabel);
    const exactMatch = project.activities.find(activity => this.normalizeKey(activity.label) === normalizedLabel);

    if (exactMatch?.artiaId) {
      return exactMatch.artiaId;
    }

    const cleanedLabel = String(activityLabel)
      .replace(new RegExp(`\\b${this.escapeRegExp(projectNumber)}\\b`, 'i'), '')
      .replace(/^[-–—\s]+/, '')
      .trim();

    if (!cleanedLabel) {
      return '';
    }

    const cleanedNormalizedLabel = this.normalizeKey(cleanedLabel);
    const cleanedMatch = project.activities.find(
      activity => this.normalizeKey(activity.label) === cleanedNormalizedLabel
    );

    return cleanedMatch?.artiaId || '';
  }

  buildSignature(event) {
    return [
      event.day,
      event.start,
      event.end,
      event.project,
      event.activityId,
      event.artiaLaunched ? '1' : '0',
      event.notes || ''
    ].join('|');
  }

  normalizeKey(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\u00A0/g, ' ');
  }

  escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  generateId() {
    return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
