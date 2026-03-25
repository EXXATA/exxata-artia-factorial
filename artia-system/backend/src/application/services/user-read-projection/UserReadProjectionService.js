import { buildProjectCatalogContext } from './projectContext.js';
import { groupByDay } from './eventSerialization.js';
import { buildDayProjectionPayload, buildSourceTimestampByDay } from './projectionPersistence.js';
import { buildRangeSummaryResponse } from './rangeSummaryBuilder.js';
import { addDays, toIsoDay } from './shared.js';
import { buildWeekViewResponse } from './weekViewBuilder.js';

export class UserReadProjectionService {
  constructor({
    userRepository,
    eventRepository,
    projectionRepository,
    snapshotRepository,
    integrationReadModelService,
    accessibleProjectCatalogService,
    cachedProjectAccessService,
    artiaHoursReadService
  }) {
    this.userRepository = userRepository;
    this.eventRepository = eventRepository;
    this.projectionRepository = projectionRepository;
    this.snapshotRepository = snapshotRepository;
    this.integrationReadModelService = integrationReadModelService;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
    this.cachedProjectAccessService = cachedProjectAccessService;
    this.artiaHoursReadService = artiaHoursReadService;
    this.backgroundRefreshes = new Map();
  }

  isForceRefresh(value) {
    return value === true || value === 'true' || value === '1' || value === 1;
  }

  buildRange(options = {}) {
    if (options.startDate && options.endDate) {
      return { startDate: options.startDate, endDate: options.endDate };
    }

    if (options.date) {
      const day = options.date instanceof Date
        ? options.date.toISOString().split('T')[0]
        : new Date(options.date).toISOString().split('T')[0];
      return { startDate: day, endDate: day };
    }

    if (options.year && options.month) {
      const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
      const endDate = new Date(options.year, options.month, 0).toISOString().split('T')[0];
      return { startDate, endDate };
    }

    const endDate = new Date().toISOString().split('T')[0];
    return { startDate: addDays(endDate, -30), endDate };
  }

  listDays(startDate, endDate) {
    const days = [];
    let cursor = startDate;

    while (cursor <= endDate) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  }

  buildRefreshKey(userId, range) {
    return `${userId}:${range.startDate}:${range.endDate}`;
  }

  async hasFullProjectionCoverage(userId, range) {
    const [dayRollups, days] = await Promise.all([
      this.projectionRepository.listDayRollups(userId, range.startDate, range.endDate),
      Promise.resolve(this.listDays(range.startDate, range.endDate))
    ]);

    return dayRollups.length >= days.length;
  }

  async ensureProjectionForRange(user, range, { forceRefresh = false } = {}) {
    const shouldForceRefresh = this.isForceRefresh(forceRefresh);
    const [accessState, projectCatalog] = await Promise.all([
      this.cachedProjectAccessService.getAccessibleProjectIdsForUser(user, { forceRefresh: shouldForceRefresh }),
      this.integrationReadModelService.getProjectCatalog({ forceRefresh: shouldForceRefresh }),
      this.integrationReadModelService.getFactorialDailyHours(user, range, { forceRefresh: shouldForceRefresh }),
      this.integrationReadModelService.getArtiaSnapshots(user, range, { forceRefresh: shouldForceRefresh })
    ]);
    const days = this.listDays(range.startDate, range.endDate);
    const [factorialRows, artiaDailyRows, artiaEntryRows, existingDayRollups, eventDomains] = await Promise.all([
      this.snapshotRepository.getFactorialDailyHours(user.id, range.startDate, range.endDate),
      this.snapshotRepository.getArtiaDailyHours(user.id, range.startDate, range.endDate),
      this.snapshotRepository.getArtiaTimeEntries(user.id, range.startDate, range.endDate),
      this.projectionRepository.listDayRollups(user.id, range.startDate, range.endDate),
      this.eventRepository.findByDateRange(range.startDate, range.endDate, user.id)
    ]);

    const sourceByDay = buildSourceTimestampByDay(days, factorialRows, artiaDailyRows, accessState.lastSyncedAt);
    const projectionByDay = Object.fromEntries((existingDayRollups || []).map((row) => [toIsoDay(row.day), row]));
    const daysToRecompute = days.filter((day) => {
      if (shouldForceRefresh) {
        return true;
      }

      const projection = projectionByDay[day];
      if (!projection) {
        return true;
      }

      const projectionTimestamp = new Date(projection.last_computed_at || 0).getTime();
      return projectionTimestamp < (sourceByDay[day] || 0);
    });

    if (daysToRecompute.length === 0) {
      return;
    }

    const projectContext = {
      ...buildProjectCatalogContext(projectCatalog),
      accessibleProjectIds: accessState.projectIds || []
    };
    const normalizedArtiaEntries = this.snapshotRepository.normalizeArtiaEntryRows(artiaEntryRows);
    const sourceTable = artiaDailyRows.find((row) => row.source_table)?.source_table || null;
    const artiaSource = sourceTable ? { tableName: sourceTable } : null;
    const decoratedEvents = this.artiaHoursReadService.decorateEventsWithTimeEntries(
      eventDomains.map((event) => event.toJSON()),
      normalizedArtiaEntries,
      artiaSource,
      null
    );
    const factorialHoursByDay = this.snapshotRepository.normalizeFactorialRows(factorialRows);
    const artiaEntriesByDay = groupByDay(normalizedArtiaEntries, 'date');
    const decoratedEventsByDay = groupByDay(decoratedEvents, 'day');

    for (const day of daysToRecompute) {
      const payload = buildDayProjectionPayload(user.id, day, new Date().toISOString(), {
        decoratedEvents: decoratedEventsByDay[day] || [],
        artiaEntries: artiaEntriesByDay[day] || [],
        factorialHours: factorialHoursByDay[day] || 0,
        artiaSource,
        artiaReason: null,
        projectContext
      });

      await this.projectionRepository.replaceDayProjection(user.id, day, payload);
    }
  }

  refreshProjectionInBackground(user, range) {
    const key = this.buildRefreshKey(user.id, range);
    if (this.backgroundRefreshes.has(key)) {
      return;
    }

    const refreshPromise = this.ensureProjectionForRange(user, range)
      .catch((error) => {
        console.error('Background projection refresh failed:', {
          userId: user.id,
          startDate: range.startDate,
          endDate: range.endDate,
          message: error?.message || String(error)
        });
      })
      .finally(() => {
        this.backgroundRefreshes.delete(key);
      });

    this.backgroundRefreshes.set(key, refreshPromise);
  }

  async prepareProjectionRead(user, range, { forceRefresh = false } = {}) {
    if (this.isForceRefresh(forceRefresh)) {
      await this.ensureProjectionForRange(user, range, { forceRefresh: true });
      return;
    }

    const hasCoverage = await this.hasFullProjectionCoverage(user.id, range);
    if (!hasCoverage) {
      await this.ensureProjectionForRange(user, range);
      return;
    }

    this.refreshProjectionInBackground(user, range);
  }

  async getWeekView(userId, options = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const range = this.buildRange(options);
    await this.prepareProjectionRead(user, range, { forceRefresh: options.forceRefresh });

    const projectAccessScopeKey = this.cachedProjectAccessService.buildScopeKey(user.id);
    const [eventRows, dayRows, projectAccessRows, projectAccessSyncState] = await Promise.all([
      this.projectionRepository.listEventProjections(user.id, range.startDate, range.endDate),
      this.projectionRepository.listDayRollups(user.id, range.startDate, range.endDate),
      this.projectionRepository.listProjectAccess(user.id),
      this.snapshotRepository.getSyncState('user_project_access', projectAccessScopeKey)
    ]);

    return buildWeekViewResponse(eventRows, dayRows, {
      ...options,
      ...range,
      accessibleProjectCount: projectAccessRows.length,
      projectAccessLastSyncedAt: projectAccessSyncState?.last_synced_at || projectAccessRows[0]?.lastSyncedAt || null
    });
  }

  async getRangeSummary(userId, options = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const range = this.buildRange(options);
    await this.prepareProjectionRead(user, range, { forceRefresh: options.forceRefresh });

    const [dayRows, projectRows, activityRows] = await Promise.all([
      this.projectionRepository.listDayRollups(user.id, range.startDate, range.endDate),
      this.projectionRepository.listProjectDayRollups(user.id, range.startDate, range.endDate),
      this.projectionRepository.listActivityDayRollups(user.id, range.startDate, range.endDate)
    ]);

    return buildRangeSummaryResponse(dayRows, projectRows, activityRows, { ...options, ...range });
  }

  async recomputeDaysForUser(userId, days, { forceRefresh = false } = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user || !Array.isArray(days) || days.length === 0) {
      return;
    }

    const normalizedDays = Array.from(new Set(days.map((day) => toIsoDay(day)).filter(Boolean))).sort();
    await this.ensureProjectionForRange(user, {
      startDate: normalizedDays[0],
      endDate: normalizedDays[normalizedDays.length - 1]
    }, { forceRefresh });
  }
}
