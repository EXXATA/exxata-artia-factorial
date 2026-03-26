import { Event } from '../../../domain/entities/Event.js';
import { TimeRange } from '../../../domain/value-objects/TimeRange.js';

function buildError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export class ApplyEventImportUseCase {
  constructor(
    eventRepository,
    eventValidationService,
    accessibleProjectCatalogService,
    userReadProjectionService = null
  ) {
    this.eventRepository = eventRepository;
    this.eventValidationService = eventValidationService;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
    this.userReadProjectionService = userReadProjectionService;
  }

  async execute({ rows = [], user }) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw buildError('Nenhuma linha enviada para aplicar a importação.', 400);
    }

    const hasCriticalRows = rows.some((row) => (
      row?.status === 'critical'
      || (row?.issues || []).some((issue) => issue.severity === 'critical')
    ));

    if (hasCriticalRows) {
      throw buildError('A importação contém linhas críticas e não pode ser aplicada.', 400);
    }

    const validRows = rows.filter((row) => row?.status === 'valid' && row?.normalized);
    const warningRows = rows.filter((row) => row?.status === 'warning');
    let skippedWarnings = warningRows.length;

    if (validRows.length === 0) {
      return {
        receivedRows: rows.length,
        imported: 0,
        skippedWarnings,
        affectedDays: []
      };
    }

    const days = Array.from(new Set(validRows.map((row) => row.normalized.day))).sort();
    const existingEvents = await this.eventRepository.findByDateRange(days[0], days[days.length - 1], user.id);
    const eventsByDay = existingEvents.reduce((accumulator, event) => {
      const normalized = event.toJSON ? event.toJSON() : event;
      if (!accumulator[normalized.day]) {
        accumulator[normalized.day] = [];
      }

      accumulator[normalized.day].push(normalized);
      return accumulator;
    }, {});

    const eventsToPersist = [];
    const seenSignatures = new Set(
      existingEvents.map((event) => this.buildSignature(event.toJSON ? event.toJSON() : event))
    );

    for (const row of validRows) {
      const normalized = row.normalized;
      const signature = this.buildSignature(normalized);
      if (seenSignatures.has(signature)) {
        skippedWarnings += 1;
        continue;
      }

      const resolvedSelection = await this.accessibleProjectCatalogService.resolveEventSelection(user, {
        project: normalized.project,
        activity: normalized.activity,
        activityId: normalized.activity?.id,
        activityLabel: normalized.activity?.label
      });

      const event = new Event({
        id: this.generateId(),
        userId: user.id,
        timeRange: new TimeRange(
          new Date(normalized.start),
          new Date(normalized.end),
          normalized.day
        ),
        project: resolvedSelection.project.number,
        activity: resolvedSelection.activity,
        notes: normalized.notes || '',
        artiaLaunched: Boolean(normalized.artiaLaunched),
        workplace: normalized.workplace || null
      });

      const eventsOnDay = (eventsByDay[normalized.day] || []).map((item) => this.toEventLike(item));
      try {
        this.eventValidationService.validateEvent(event, eventsOnDay);
      } catch (error) {
        throw buildError(error.message, error.message.includes('overlaps') ? 409 : 400);
      }

      eventsToPersist.push(event);
      seenSignatures.add(signature);

      if (!eventsByDay[normalized.day]) {
        eventsByDay[normalized.day] = [];
      }

      eventsByDay[normalized.day].push(event.toJSON());
    }

    const persistedEvents = await this.eventRepository.bulkCreate(eventsToPersist);

    if (this.userReadProjectionService && days.length > 0) {
      await this.userReadProjectionService.recomputeDaysForUser(user.id, days);
    }

    return {
      receivedRows: rows.length,
      imported: persistedEvents.length,
      skippedWarnings,
      affectedDays: days
    };
  }

  toEventLike(event) {
    return {
      id: event.id,
      overlaps(otherEvent) {
        if (event.day !== otherEvent.timeRange.day) {
          return false;
        }

        return new Date(event.start).getTime() < otherEvent.timeRange.end.getTime()
          && otherEvent.timeRange.start.getTime() < new Date(event.end).getTime();
      },
      getDurationInMinutes() {
        return Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000);
      },
      timeRange: {
        day: event.day,
        start: new Date(event.start),
        end: new Date(event.end),
        overlaps(otherTimeRange) {
          return new Date(event.start).getTime() < otherTimeRange.end.getTime()
            && otherTimeRange.start.getTime() < new Date(event.end).getTime();
        }
      }
    };
  }

  generateId() {
    return `ev_import_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  buildSignature(event) {
    return [
      event.day,
      event.start,
      event.end,
      event.project,
      event.activity?.id || event.activityId || '',
      event.artiaLaunched ? '1' : '0',
      event.notes || ''
    ].join('|');
  }
}
