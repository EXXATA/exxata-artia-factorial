export class IntegrationReadModelService {
  constructor({
    snapshotRepository,
    artiaDBService,
    factorialService,
    artiaHoursReadService,
    inMemoryCache
  }) {
    this.snapshotRepository = snapshotRepository;
    this.artiaDBService = artiaDBService;
    this.factorialService = factorialService;
    this.artiaHoursReadService = artiaHoursReadService;
    this.inMemoryCache = inMemoryCache;
    this.projectCatalogTtlHours = 6;
    this.factorialHoursTtlHours = 0.25;
    this.artiaHoursTtlHours = 0.1;
  }

  isForceRefresh(value) {
    return value === true || value === 'true' || value === '1' || value === 1;
  }

  async refreshProjectCatalog({ forceRefresh = false } = {}) {
    const scopeKey = 'global';
    const cacheKey = `project-catalog:${scopeKey}`;
    const shouldForceRefresh = this.isForceRefresh(forceRefresh);

    const projectRows = await this.snapshotRepository.listProjectCatalog({ scopeKey });
    const syncState = await this.snapshotRepository.getSyncState('artia_project_catalog', scopeKey);

    if (!shouldForceRefresh && projectRows.length > 0 && this.snapshotRepository.isFresh(syncState)) {
      return projectRows;
    }

    if (shouldForceRefresh) {
      this.inMemoryCache.delete(cacheKey);
    }

    const projects = await this.inMemoryCache.remember(
      cacheKey,
      () => this.artiaDBService.getProjectsWithActivities(),
      60 * 1000
    );

    const syncedAt = new Date().toISOString();
    const refreshed = await this.snapshotRepository.replaceProjectCatalog(projects, {
      scopeKey,
      syncedAt,
      source: 'artia_mysql'
    });

    await this.snapshotRepository.upsertSyncState({
      resourceType: 'artia_project_catalog',
      scopeKey,
      syncStatus: 'ready',
      lastSyncedAt: syncedAt,
      expiresAt: this.snapshotRepository.buildExpiry(syncedAt, this.projectCatalogTtlHours),
      metadata: {
        projectCount: refreshed.length,
        source: 'artia_mysql'
      }
    });

    return refreshed;
  }

  async getProjectCatalog({ searchTerm = '', forceRefresh = false } = {}) {
    await this.refreshProjectCatalog({ forceRefresh });
    return this.snapshotRepository.listProjectCatalog({ searchTerm, scopeKey: 'global' });
  }

  async getProjectActivities(projectId, { forceRefresh = false } = {}) {
    await this.refreshProjectCatalog({ forceRefresh });
    return this.snapshotRepository.getProjectActivities(projectId, { scopeKey: 'global' });
  }

  buildRange(options = {}) {
    if (options.startDate && options.endDate) {
      return {
        startDate: options.startDate,
        endDate: options.endDate
      };
    }

    if (options.year && options.month) {
      const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
      const endDate = new Date(options.year, options.month, 0).toISOString().split('T')[0];
      return { startDate, endDate };
    }

    if (options.date) {
      const date = options.date instanceof Date ? options.date : new Date(options.date);
      const day = date.toISOString().split('T')[0];
      return { startDate: day, endDate: day };
    }

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    return { startDate, endDate };
  }

  normalizeDayValue(value) {
    if (!value) {
      return null;
    }

    const rawValue = value instanceof Date
      ? value.toISOString()
      : String(value);
    const normalizedInput = rawValue.includes('T') ? rawValue : `${rawValue}T00:00:00`;
    const date = new Date(normalizedInput);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().split('T')[0];
  }

  isDayWithinRange(day, range) {
    const normalizedDay = this.normalizeDayValue(day);
    if (!normalizedDay) {
      return false;
    }

    return normalizedDay >= range.startDate && normalizedDay <= range.endDate;
  }

  filterHoursByRange(hoursByDay = {}, range) {
    return Object.fromEntries(
      Object.entries(hoursByDay || {}).filter(([day]) => this.isDayWithinRange(day, range))
    );
  }

  filterEntriesByRange(entries = [], range) {
    return (entries || []).filter((entry) => this.isDayWithinRange(entry.date || entry.day, range));
  }

  aggregateFactorialShifts(shifts = []) {
    return shifts.reduce((accumulator, shift) => {
      const day = this.normalizeDayValue(shift.day);
      if (!day) {
        return accumulator;
      }

      accumulator[day] = (accumulator[day] || 0) + (shift.workingHours || 0);
      return accumulator;
    }, {});
  }

  async getFactorialDailyHours(user, range, { forceRefresh = false } = {}) {
    const scopeKey = this.snapshotRepository.buildScopeKey('factorial_daily_hours', user.id, range.startDate, range.endDate);
    const syncState = await this.snapshotRepository.getSyncState('factorial_daily_hours', scopeKey);
    const cachedRows = await this.snapshotRepository.getFactorialDailyHours(user.id, range.startDate, range.endDate);
    const shouldForceRefresh = this.isForceRefresh(forceRefresh);

    if (!shouldForceRefresh && this.snapshotRepository.isFresh(syncState)) {
      return this.snapshotRepository.normalizeFactorialRows(cachedRows);
    }

    const memoryCacheKey = `factorial-shifts:${user.factorialEmployeeId}:${range.startDate}:${range.endDate}`;
    if (shouldForceRefresh) {
      this.inMemoryCache.delete(memoryCacheKey);
    }

    const shifts = await this.inMemoryCache.remember(
      memoryCacheKey,
      () => this.factorialService.getShiftsByDateRange(user.factorialEmployeeId, new Date(`${range.startDate}T00:00:00`), new Date(`${range.endDate}T00:00:00`)),
      60 * 1000
    );

    const filteredShifts = (shifts || []).filter((shift) => this.isDayWithinRange(shift.day, range));
    const hoursByDay = this.filterHoursByRange(this.aggregateFactorialShifts(filteredShifts), range);
    const syncedAt = new Date().toISOString();

    await this.snapshotRepository.replaceFactorialDailyHours(user.id, user.factorialEmployeeId, range.startDate, range.endDate, hoursByDay, syncedAt);
    await this.snapshotRepository.upsertSyncState({
      resourceType: 'factorial_daily_hours',
      scopeKey,
      userId: user.id,
      syncStatus: 'ready',
      lastSyncedAt: syncedAt,
      expiresAt: this.snapshotRepository.buildExpiry(syncedAt, this.factorialHoursTtlHours),
      metadata: {
        startDate: range.startDate,
        endDate: range.endDate,
        days: Object.keys(hoursByDay).length
      }
    });

    return hoursByDay;
  }

  async getArtiaSnapshots(user, range, { forceRefresh = false } = {}) {
    const scopeKey = this.snapshotRepository.buildScopeKey('artia_time_entries', user.id, range.startDate, range.endDate);
    const syncState = await this.snapshotRepository.getSyncState('artia_time_entries', scopeKey);
    const cachedEntriesRows = await this.snapshotRepository.getArtiaTimeEntries(user.id, range.startDate, range.endDate);
    const shouldForceRefresh = this.isForceRefresh(forceRefresh);

    if (!shouldForceRefresh && this.snapshotRepository.isFresh(syncState)) {
      const cachedEntries = this.snapshotRepository.normalizeArtiaEntryRows(cachedEntriesRows);
      const dailyRows = await this.snapshotRepository.getArtiaDailyHours(user.id, range.startDate, range.endDate);
      return {
        entries: cachedEntries,
        dailyHoursByDay: this.snapshotRepository.normalizeArtiaDailyRows(dailyRows),
        source: syncState?.metadata?.sourceTable ? { tableName: syncState.metadata.sourceTable } : null,
        reason: syncState?.metadata?.reason || null
      };
    }

    const result = await this.artiaHoursReadService.getWorkedTimeEntriesForUser({
      email: user.email,
      artiaUserId: user.artiaUserId,
      startDate: range.startDate,
      endDate: range.endDate
    });
    const filteredEntries = this.filterEntriesByRange(result.entries, range);

    const syncedAt = new Date().toISOString();
    await this.snapshotRepository.replaceArtiaTimeEntries(
      user.id,
      user.artiaUserId,
      range.startDate,
      range.endDate,
      filteredEntries,
      result.source?.tableName || null,
      syncedAt
    );

    const dailyPayload = this.snapshotRepository.buildArtiaDailyPayload(filteredEntries);
    await this.snapshotRepository.replaceArtiaDailyHours(
      user.id,
      user.artiaUserId,
      range.startDate,
      range.endDate,
      dailyPayload,
      result.source?.tableName || null,
      syncedAt
    );

    await this.snapshotRepository.upsertSyncState({
      resourceType: 'artia_time_entries',
      scopeKey,
      userId: user.id,
      syncStatus: result.reason ? 'degraded' : 'ready',
      lastSyncedAt: syncedAt,
      expiresAt: this.snapshotRepository.buildExpiry(syncedAt, this.artiaHoursTtlHours),
      errorMessage: result.reason,
      metadata: {
        sourceTable: result.source?.tableName || null,
        entryCount: filteredEntries.length,
        reason: result.reason,
        startDate: range.startDate,
        endDate: range.endDate
      }
    });

    return {
      entries: filteredEntries,
      dailyHoursByDay: dailyPayload,
      source: result.source,
      reason: result.reason
    };
  }

  async decorateEventsWithSyncStatus(events, user, options = {}) {
    if (!events?.length) {
      return [];
    }

    const range = this.buildRange(options.startDate || options.endDate ? options : {
      startDate: events[0]?.day,
      endDate: events[events.length - 1]?.day
    });

    const artiaSnapshot = await this.getArtiaSnapshots(user, range, {
      forceRefresh: this.isForceRefresh(options.forceRefresh)
    });

    return this.artiaHoursReadService.decorateEventsWithTimeEntries(
      events,
      artiaSnapshot.entries,
      artiaSnapshot.source,
      artiaSnapshot.reason
    );
  }
}
