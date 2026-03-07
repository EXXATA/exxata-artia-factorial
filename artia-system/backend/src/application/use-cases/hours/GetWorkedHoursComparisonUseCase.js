import { WorkedHoursComparison } from '../../../domain/value-objects/WorkedHoursComparison.js';

export class GetWorkedHoursComparisonUseCase {
  constructor(factorialService, eventRepository, userRepository, artiaHoursReadService) {
    this.factorialService = factorialService;
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.artiaHoursReadService = artiaHoursReadService;
  }

  buildRange(options = {}) {
    if (options.year && options.month) {
      const startDate = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
      const endDate = new Date(options.year, options.month, 0).toISOString().split('T')[0];
      return { startDate, endDate };
    }

    if (options.date) {
      const day = options.date instanceof Date
        ? options.date.toISOString().split('T')[0]
        : new Date(options.date).toISOString().split('T')[0];

      return { startDate: day, endDate: day };
    }

    return { startDate: null, endDate: null };
  }

  isWithinRange(day, range) {
    if (!day) {
      return false;
    }

    if (range.startDate && day < range.startDate) {
      return false;
    }

    if (range.endDate && day > range.endDate) {
      return false;
    }

    return true;
  }

  async loadSystemEvents(userId, range) {
    if (range.startDate && range.endDate) {
      return this.eventRepository.findByDateRange(range.startDate, range.endDate, userId);
    }

    return this.eventRepository.findAll({ userId });
  }

  async execute(userId, options = {}) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (!user.factorialEmployeeId) {
      throw new Error('Usuário não vinculado ao Factorial');
    }

    const range = this.buildRange(options);
    const factorialHoursByDay = await this.factorialService.getAllWorkedHours(user.factorialEmployeeId);
    const filteredFactorialHoursByDay = Object.fromEntries(
      Object.entries(factorialHoursByDay).filter(([day]) => this.isWithinRange(day, range))
    );

    const systemEvents = await this.loadSystemEvents(userId, range);
    const serializedEvents = systemEvents.map((event) => event.toJSON());

    const artiaResult = await this.artiaHoursReadService.getWorkedTimeEntriesForUser({
      email: user.email,
      artiaUserId: user.artiaUserId,
      startDate: range.startDate,
      endDate: range.endDate
    });

    const decoratedEvents = this.artiaHoursReadService.decorateEventsWithTimeEntries(
      serializedEvents,
      artiaResult.entries,
      artiaResult.source,
      artiaResult.reason
    );

    const artiaHoursByDay = {};
    const artiaEntriesCountByDay = {};
    artiaResult.entries.forEach((entry) => {
      artiaHoursByDay[entry.date] = (artiaHoursByDay[entry.date] || 0) + entry.hours;
      artiaEntriesCountByDay[entry.date] = (artiaEntriesCountByDay[entry.date] || 0) + 1;
    });

    const systemHoursByDay = {};
    const syncedSystemHoursByDay = {};
    const pendingSystemHoursByDay = {};
    const manualSystemHoursByDay = {};

    decoratedEvents.forEach((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const hours = Math.max(0, (end.getTime() - start.getTime()) / 3600000);

      systemHoursByDay[event.day] = (systemHoursByDay[event.day] || 0) + hours;

      if (event.artiaSyncStatus === 'synced') {
        syncedSystemHoursByDay[event.day] = (syncedSystemHoursByDay[event.day] || 0) + hours;
        return;
      }

      pendingSystemHoursByDay[event.day] = (pendingSystemHoursByDay[event.day] || 0) + hours;

      if (event.artiaSyncStatus === 'manual') {
        manualSystemHoursByDay[event.day] = (manualSystemHoursByDay[event.day] || 0) + hours;
      }
    });

    const allDates = new Set([
      ...Object.keys(filteredFactorialHoursByDay),
      ...Object.keys(systemHoursByDay),
      ...Object.keys(artiaHoursByDay)
    ]);

    const comparisons = Array.from(allDates).map((date) => {
      return new WorkedHoursComparison({
        date,
        factorialHours: filteredFactorialHoursByDay[date] || 0,
        artiaHours: artiaHoursByDay[date] || 0,
        systemHours: systemHoursByDay[date] || 0,
        syncedSystemHours: syncedSystemHoursByDay[date] || 0,
        pendingSystemHours: pendingSystemHoursByDay[date] || 0,
        manualSystemHours: manualSystemHoursByDay[date] || 0,
        artiaEntryCount: artiaEntriesCountByDay[date] || 0
      });
    });

    comparisons.sort((a, b) => b.date - a.date);

    const stats = {
      totalDays: comparisons.length,
      daysWithDivergence: comparisons.filter((comparison) => comparison.hasDivergence).length,
      daysPendingSync: comparisons.filter((comparison) => comparison.hasPendingSync).length,
      totalFactorialHours: comparisons.reduce((sum, comparison) => sum + comparison.factorialHours, 0),
      totalArtiaHours: comparisons.reduce((sum, comparison) => sum + comparison.artiaHours, 0),
      totalSystemHours: comparisons.reduce((sum, comparison) => sum + comparison.systemHours, 0),
      totalSyncedSystemHours: comparisons.reduce((sum, comparison) => sum + comparison.syncedSystemHours, 0),
      totalPendingSystemHours: comparisons.reduce((sum, comparison) => sum + comparison.pendingSystemHours, 0),
      totalManualSystemHours: comparisons.reduce((sum, comparison) => sum + comparison.manualSystemHours, 0),
      artiaSourceAvailable: Boolean(artiaResult.source),
      artiaSourceTable: artiaResult.source?.tableName || null,
      artiaReadReason: artiaResult.reason
    };

    return {
      comparisons: comparisons.map((comparison) => comparison.toJSON()),
      stats
    };
  }
}
