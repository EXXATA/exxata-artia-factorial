import { WorkedHoursComparison } from '../../../domain/value-objects/WorkedHoursComparison.js';

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isSyntheticProjectNumber(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .startsWith('SEM-NUMERO-');
}

export class GetWorkedHoursComparisonUseCase {
  constructor(eventRepository, userRepository, integrationReadModelService, accessibleProjectCatalogService = null) {
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.integrationReadModelService = integrationReadModelService;
    this.accessibleProjectCatalogService = accessibleProjectCatalogService;
  }

  buildRange(options = {}) {
    if (options.startDate && options.endDate) {
      return { startDate: options.startDate, endDate: options.endDate };
    }

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

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    return { startDate, endDate };
  }

  async loadSystemEvents(userId, range) {
    if (range.startDate && range.endDate) {
      return this.eventRepository.findByDateRange(range.startDate, range.endDate, userId);
    }

    return this.eventRepository.findAll({ userId });
  }

  buildProjectCatalogContext(projectCatalog = []) {
    const byId = new Map();
    const byNumber = new Map();
    const byNormalizedLabel = new Map();

    projectCatalog.forEach((project) => {
      const normalizedNumber = normalizeText(project.number);
      const normalizedLabel = normalizeText(`${project.number || ''} ${project.name || ''}`);

      if (project.id) {
        byId.set(String(project.id), project);
      }

      if (normalizedNumber) {
        byNumber.set(normalizedNumber, project);
      }

      if (normalizedLabel) {
        byNormalizedLabel.set(normalizedLabel, project);
      }
    });

    return {
      list: projectCatalog,
      byId,
      byNumber,
      byNormalizedLabel
    };
  }

  extractProjectNumber(value) {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }

    if (text.includes(' - ')) {
      return text.split(' - ')[0].trim();
    }

    return text;
  }

  buildCatalogProjectDescriptor(project) {
    return {
      key: String(project.id),
      id: String(project.id),
      number: String(project.number || '').trim(),
      name: String(project.name || '').trim(),
      label: `${project.number || ''}${project.name ? ` - ${project.name}` : ''}`.trim()
    };
  }

  resolveVisualEnd(entry) {
    if (entry?.end) {
      return {
        end: entry.end,
        endEstimated: false,
        isRenderableInCalendar: Boolean(entry.start)
      };
    }

    if (!entry?.start || !Number.isFinite(Number(entry?.minutes)) || Number(entry.minutes) <= 0) {
      return {
        end: null,
        endEstimated: false,
        isRenderableInCalendar: false
      };
    }

    const startDate = new Date(entry.start);
    if (Number.isNaN(startDate.getTime())) {
      return {
        end: null,
        endEstimated: false,
        isRenderableInCalendar: false
      };
    }

    const resolvedEnd = new Date(startDate.getTime() + (Number(entry.minutes) * 60000)).toISOString();
    return {
      end: resolvedEnd,
      endEstimated: true,
      isRenderableInCalendar: true
    };
  }

  buildProjectDisplayLabel(projectDescriptor, rawProject = '') {
    const descriptorNumber = String(projectDescriptor?.number || '').trim();
    const descriptorName = String(projectDescriptor?.name || '').trim();
    const rawLabel = String(rawProject || '').trim();

    if (rawLabel && (!descriptorNumber || isSyntheticProjectNumber(descriptorNumber))) {
      return rawLabel;
    }

    if (rawLabel) {
      const normalizedRawLabel = normalizeText(rawLabel);
      const normalizedDescriptorName = normalizeText(descriptorName);
      const normalizedComposite = normalizeText(`${descriptorNumber} ${descriptorName}`);

      if (normalizedRawLabel === normalizedComposite || normalizedRawLabel === normalizedDescriptorName) {
        return rawLabel;
      }
    }

    if (descriptorName) {
      if (!descriptorNumber || isSyntheticProjectNumber(descriptorNumber)) {
        return descriptorName;
      }

      if (normalizeText(descriptorName).startsWith(normalizeText(descriptorNumber))) {
        return descriptorName;
      }

      return `${descriptorNumber} - ${descriptorName}`;
    }

    if (descriptorNumber && !isSyntheticProjectNumber(descriptorNumber)) {
      return descriptorNumber;
    }

    return rawLabel || descriptorName || 'Sem projeto';
  }

  async loadProjectCatalogForUser(user, options = {}) {
    if (this.accessibleProjectCatalogService) {
      return this.accessibleProjectCatalogService.getAccessibleProjectCatalog(user, {
        forceRefresh: options.forceRefresh
      });
    }

    return this.integrationReadModelService.getProjectCatalog({
      forceRefresh: options.forceRefresh
    });
  }

  resolveCatalogProjectDescriptor(projectContext, { systemProject = '', artiaProject = '', artiaProjectId = '' } = {}) {
    const projectIdKey = artiaProjectId ? String(artiaProjectId).trim() : '';
    if (projectIdKey && projectContext.byId.has(projectIdKey)) {
      return this.buildCatalogProjectDescriptor(projectContext.byId.get(projectIdKey));
    }

    const normalizedSystemProject = normalizeText(this.extractProjectNumber(systemProject));
    if (normalizedSystemProject && projectContext.byNumber.has(normalizedSystemProject)) {
      return this.buildCatalogProjectDescriptor(projectContext.byNumber.get(normalizedSystemProject));
    }

    const normalizedArtiaProjectNumber = normalizeText(this.extractProjectNumber(artiaProject));
    if (normalizedArtiaProjectNumber && projectContext.byNumber.has(normalizedArtiaProjectNumber)) {
      return this.buildCatalogProjectDescriptor(projectContext.byNumber.get(normalizedArtiaProjectNumber));
    }

    const normalizedArtiaLabel = normalizeText(artiaProject);
    if (normalizedArtiaLabel && projectContext.byNormalizedLabel.has(normalizedArtiaLabel)) {
      return this.buildCatalogProjectDescriptor(projectContext.byNormalizedLabel.get(normalizedArtiaLabel));
    }

    return null;
  }

  resolveProjectDescriptor(projectContext, { systemProject = '', artiaProject = '', artiaProjectId = '' } = {}) {
    const catalogDescriptor = this.resolveCatalogProjectDescriptor(projectContext, {
      systemProject,
      artiaProject,
      artiaProjectId
    });
    if (catalogDescriptor) {
      return catalogDescriptor;
    }

    const projectIdKey = artiaProjectId ? String(artiaProjectId).trim() : '';
    const rawNumber = this.extractProjectNumber(systemProject || artiaProject || projectIdKey);
    const rawName = String(artiaProject || systemProject || rawNumber || 'Sem projeto').trim();

    return {
      key: projectIdKey || normalizeText(rawNumber || rawName) || 'sem-projeto',
      id: projectIdKey || null,
      number: rawNumber || null,
      name: rawName || 'Sem projeto',
      label: rawNumber && rawName && rawName !== rawNumber ? `${rawNumber} - ${rawName}` : rawName || rawNumber || 'Sem projeto'
    };
  }

  matchesProjectFilter(projectContext, projectFilter, payload) {
    if (!projectFilter) {
      return true;
    }

    const descriptor = this.resolveProjectDescriptor(projectContext, payload);
    const normalizedFilter = normalizeText(projectFilter);

    return [descriptor.key, descriptor.id, descriptor.number, descriptor.name, descriptor.label]
      .filter(Boolean)
      .some((value) => normalizeText(value) === normalizedFilter || normalizeText(value).includes(normalizedFilter));
  }

  matchesActivityFilter(activityFilter, activityId, activityLabel) {
    if (!activityFilter) {
      return true;
    }

    const normalizedFilter = normalizeText(activityFilter);
    return [activityId, activityLabel]
      .filter(Boolean)
      .some((value) => normalizeText(value) === normalizedFilter || normalizeText(value).includes(normalizedFilter));
  }

  serializeSystemEvent(event, projectDescriptor) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const minutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    const projectDisplayLabel = this.buildProjectDisplayLabel(projectDescriptor, event.project);

    return {
      id: event.id,
      day: event.day,
      start: event.start,
      end: event.end,
      minutes,
      hours: Number((minutes / 60).toFixed(2)),
      project: event.project,
      projectKey: projectDescriptor.key,
      projectId: projectDescriptor.id,
      projectNumber: projectDescriptor.number,
      projectName: projectDescriptor.name,
      projectLabel: projectDisplayLabel,
      projectDisplayLabel,
      activityId: event.activityId,
      activityLabel: event.activityLabel,
      notes: event.notes || '',
      artiaLaunched: Boolean(event.artiaLaunched),
      artiaSyncStatus: event.artiaSyncStatus,
      artiaSyncLabel: event.artiaSyncLabel,
      artiaRemoteEntryId: event.artiaRemoteEntryId,
      artiaRemoteHours: event.artiaRemoteHours || 0,
      artiaRemoteProject: event.artiaRemoteProject || null,
      artiaRemoteActivity: event.artiaRemoteActivity || null,
      artiaRemoteStart: event.artiaRemoteStart || null,
      artiaRemoteEnd: event.artiaRemoteEnd || null
    };
  }

  serializeArtiaEntry(entry, projectDescriptor) {
    const visualEnd = this.resolveVisualEnd(entry);
    const projectDisplayLabel = this.buildProjectDisplayLabel(projectDescriptor, entry.project);

    return {
      id: entry.id,
      day: entry.date,
      start: entry.start,
      end: visualEnd.end,
      endEstimated: visualEnd.endEstimated,
      isRenderableInCalendar: visualEnd.isRenderableInCalendar,
      minutes: entry.minutes,
      hours: entry.hours,
      project: entry.project,
      projectKey: projectDescriptor.key,
      projectId: projectDescriptor.id,
      projectNumber: projectDescriptor.number,
      projectName: projectDescriptor.name,
      projectLabel: projectDisplayLabel,
      projectDisplayLabel,
      activity: entry.activity,
      activityLabel: entry.activity,
      activityId: entry.activityId,
      notes: entry.notes || '',
      status: entry.status || null,
      sourceTable: entry.sourceTable || null
    };
  }

  groupByDay(items, dayField) {
    return items.reduce((accumulator, item) => {
      const day = item[dayField];
      if (!day) {
        return accumulator;
      }

      if (!accumulator[day]) {
        accumulator[day] = [];
      }

      accumulator[day].push(item);
      return accumulator;
    }, {});
  }

  buildProjectAndActivitySummaries({ comparisons, systemEvents, artiaEntries, remoteOnlyEntryIds }) {
    const projectMap = new Map();
    const activityMap = new Map();
    const comparisonByDate = Object.fromEntries(comparisons.map((comparison) => [comparison.date, comparison]));

    const ensureProjectSummary = (projectDescriptor) => {
      if (!projectMap.has(projectDescriptor.key)) {
        projectMap.set(projectDescriptor.key, {
          projectKey: projectDescriptor.key,
          projectId: projectDescriptor.id,
          projectNumber: projectDescriptor.number,
          projectName: projectDescriptor.name,
          projectLabel: projectDescriptor.label,
          systemHours: 0,
          syncedSystemHours: 0,
          pendingSystemHours: 0,
          manualSystemHours: 0,
          systemEventCount: 0,
          artiaHours: 0,
          artiaEntryCount: 0,
          remoteOnlyArtiaHours: 0,
          remoteOnlyArtiaEntryCount: 0,
          byDay: {}
        });
      }

      return projectMap.get(projectDescriptor.key);
    };

    const ensureProjectDay = (projectSummary, day) => {
      if (!projectSummary.byDay[day]) {
        const comparison = comparisonByDate[day] || null;
        projectSummary.byDay[day] = {
          day,
          factorialHours: comparison?.factorialHours || 0,
          systemHours: 0,
          syncedSystemHours: 0,
          pendingSystemHours: 0,
          manualSystemHours: 0,
          artiaHours: 0,
          artiaEntryCount: 0,
          remoteOnlyArtiaHours: 0,
          remoteOnlyArtiaEntryCount: 0
        };
      }

      return projectSummary.byDay[day];
    };

    const ensureActivitySummary = (projectDescriptor, activityId, activityLabel) => {
      const key = `${projectDescriptor.key}::${activityId || activityLabel || 'sem-atividade'}`;
      if (!activityMap.has(key)) {
        activityMap.set(key, {
          key,
          projectKey: projectDescriptor.key,
          projectId: projectDescriptor.id,
          projectNumber: projectDescriptor.number,
          projectName: projectDescriptor.name,
          projectLabel: projectDescriptor.label,
          activityId: activityId || null,
          activityLabel: activityLabel || 'Sem atividade',
          systemHours: 0,
          systemEventCount: 0,
          artiaHours: 0,
          artiaEntryCount: 0,
          remoteOnlyArtiaHours: 0,
          remoteOnlyArtiaEntryCount: 0
        });
      }

      return activityMap.get(key);
    };

    systemEvents.forEach((event) => {
      const projectDescriptor = {
        key: event.projectKey,
        id: event.projectId,
        number: event.projectNumber,
        name: event.projectName,
        label: event.projectLabel
      };
      const projectSummary = ensureProjectSummary(projectDescriptor);
      const daySummary = ensureProjectDay(projectSummary, event.day);
      const activitySummary = ensureActivitySummary(projectDescriptor, event.activityId, event.activityLabel);

      projectSummary.systemHours += event.hours;
      projectSummary.systemEventCount += 1;
      daySummary.systemHours += event.hours;

      if (event.artiaSyncStatus === 'synced') {
        projectSummary.syncedSystemHours += event.hours;
        daySummary.syncedSystemHours += event.hours;
      } else {
        projectSummary.pendingSystemHours += event.hours;
        daySummary.pendingSystemHours += event.hours;

        if (event.artiaSyncStatus === 'manual') {
          projectSummary.manualSystemHours += event.hours;
          daySummary.manualSystemHours += event.hours;
        }
      }

      activitySummary.systemHours += event.hours;
      activitySummary.systemEventCount += 1;
    });

    artiaEntries.forEach((entry) => {
      const projectDescriptor = {
        key: entry.projectKey,
        id: entry.projectId,
        number: entry.projectNumber,
        name: entry.projectName,
        label: entry.projectLabel
      };
      const projectSummary = ensureProjectSummary(projectDescriptor);
      const daySummary = ensureProjectDay(projectSummary, entry.day);
      const activitySummary = ensureActivitySummary(projectDescriptor, entry.activityId, entry.activity);
      const isRemoteOnly = remoteOnlyEntryIds.has(entry.id);

      projectSummary.artiaHours += entry.hours;
      projectSummary.artiaEntryCount += 1;
      daySummary.artiaHours += entry.hours;
      daySummary.artiaEntryCount += 1;

      activitySummary.artiaHours += entry.hours;
      activitySummary.artiaEntryCount += 1;

      if (isRemoteOnly) {
        projectSummary.remoteOnlyArtiaHours += entry.hours;
        projectSummary.remoteOnlyArtiaEntryCount += 1;
        daySummary.remoteOnlyArtiaHours += entry.hours;
        daySummary.remoteOnlyArtiaEntryCount += 1;

        activitySummary.remoteOnlyArtiaHours += entry.hours;
        activitySummary.remoteOnlyArtiaEntryCount += 1;
      }
    });

    const projectSummaries = Array.from(projectMap.values())
      .map((summary) => ({
        ...summary,
        differenceHours: Number((summary.systemHours - summary.artiaHours).toFixed(2)),
        byDay: Object.values(summary.byDay).sort((left, right) => left.day.localeCompare(right.day))
      }))
      .sort((left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours));

    const activitySummaries = Array.from(activityMap.values())
      .map((summary) => ({
        ...summary,
        differenceHours: Number((summary.systemHours - summary.artiaHours).toFixed(2))
      }))
      .sort((left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours));

    return {
      projectSummaries,
      activitySummaries,
      availableProjects: projectSummaries.map((summary) => ({
        key: summary.projectKey,
        id: summary.projectId,
        number: summary.projectNumber,
        name: summary.projectName,
        label: summary.projectLabel
      })),
      availableActivities: activitySummaries.map((summary) => ({
        key: summary.key,
        projectKey: summary.projectKey,
        activityId: summary.activityId,
        activityLabel: summary.activityLabel
      }))
    };
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
    const projectCatalog = await this.loadProjectCatalogForUser(user, options);
    const projectContext = this.buildProjectCatalogContext(projectCatalog);
    const factorialHoursByDay = await this.integrationReadModelService.getFactorialDailyHours(user, range, {
      forceRefresh: options.forceRefresh
    });

    const systemEvents = await this.loadSystemEvents(userId, range);
    const serializedEvents = systemEvents.map((event) => event.toJSON());

    const artiaSnapshot = await this.integrationReadModelService.getArtiaSnapshots(user, range, {
      forceRefresh: options.forceRefresh
    });

    const decoratedEvents = await this.integrationReadModelService.decorateEventsWithSyncStatus(serializedEvents, user, {
      startDate: range.startDate,
      endDate: range.endDate,
      forceRefresh: false
    });

    const filteredDecoratedEvents = decoratedEvents
      .filter((event) => this.matchesProjectFilter(projectContext, options.project, { systemProject: event.project }))
      .filter((event) => this.matchesActivityFilter(options.activity, event.activityId, event.activityLabel));

    const serializedSystemEvents = filteredDecoratedEvents
      .map((event) => {
        const projectDescriptor = this.resolveCatalogProjectDescriptor(projectContext, { systemProject: event.project });
        if (!projectDescriptor) {
          return null;
        }

        return this.serializeSystemEvent(event, projectDescriptor);
      })
      .filter(Boolean);

    const filteredArtiaEntries = (artiaSnapshot.entries || [])
      .filter((entry) => this.matchesProjectFilter(projectContext, options.project, {
        systemProject: '',
        artiaProject: entry.project,
        artiaProjectId: entry.projectId
      }))
      .filter((entry) => this.matchesActivityFilter(options.activity, entry.activityId, entry.activity))
      .map((entry) => {
        const projectDescriptor = this.resolveCatalogProjectDescriptor(projectContext, {
          systemProject: '',
          artiaProject: entry.project,
          artiaProjectId: entry.projectId
        });
        if (!projectDescriptor) {
          return null;
        }

        return this.serializeArtiaEntry(entry, projectDescriptor);
      })
      .filter(Boolean);

    const fallbackArtiaHoursByDay = Object.fromEntries(
      Object.entries(artiaSnapshot.dailyHoursByDay || {}).map(([day, value]) => [day, value.workedHours || 0])
    );
    const fallbackArtiaEntriesCountByDay = Object.fromEntries(
      Object.entries(artiaSnapshot.dailyHoursByDay || {}).map(([day, value]) => [day, value.entryCount || 0])
    );
    const useArtiaEntriesAsSource = filteredArtiaEntries.length > 0 || Boolean(options.project || options.activity);
    const artiaHoursByDay = useArtiaEntriesAsSource
      ? filteredArtiaEntries.reduce((accumulator, entry) => {
        accumulator[entry.day] = (accumulator[entry.day] || 0) + (entry.hours || 0);
        return accumulator;
      }, {})
      : fallbackArtiaHoursByDay;
    const artiaEntriesCountByDay = useArtiaEntriesAsSource
      ? filteredArtiaEntries.reduce((accumulator, entry) => {
        accumulator[entry.day] = (accumulator[entry.day] || 0) + 1;
        return accumulator;
      }, {})
      : fallbackArtiaEntriesCountByDay;

    const systemHoursByDay = {};
    const syncedSystemHoursByDay = {};
    const pendingSystemHoursByDay = {};
    const manualSystemHoursByDay = {};

    serializedSystemEvents.forEach((event) => {
      const hours = event.hours;

      systemHoursByDay[event.day] = (systemHoursByDay[event.day] || 0) + hours;

      if (event.artiaSyncStatus === 'synced') {
        syncedSystemHoursByDay[event.day] = (syncedSystemHoursByDay[event.day] || 0) + hours;
      } else {
        pendingSystemHoursByDay[event.day] = (pendingSystemHoursByDay[event.day] || 0) + hours;
      }

      if (event.artiaSyncStatus === 'manual') {
        manualSystemHoursByDay[event.day] = (manualSystemHoursByDay[event.day] || 0) + hours;
      }
    });

    const matchedRemoteEntryIds = new Set(
      serializedSystemEvents
        .map((event) => event.artiaRemoteEntryId)
        .filter(Boolean)
    );

    const remoteOnlyArtiaEntries = filteredArtiaEntries.filter((entry) => !matchedRemoteEntryIds.has(entry.id));
    const systemEventsByDay = this.groupByDay(serializedSystemEvents, 'day');
    const artiaEntriesByDay = this.groupByDay(filteredArtiaEntries, 'day');
    const remoteOnlyArtiaEntriesByDay = this.groupByDay(remoteOnlyArtiaEntries, 'day');

    const allDates = new Set([
      ...Object.keys(factorialHoursByDay),
      ...Object.keys(systemHoursByDay),
      ...Object.keys(artiaHoursByDay)
    ]);

    const comparisons = Array.from(allDates).map((date) => {
      return new WorkedHoursComparison({
        date,
        factorialHours: factorialHoursByDay[date] || 0,
        artiaHours: artiaHoursByDay[date] || 0,
        systemHours: systemHoursByDay[date] || 0,
        syncedSystemHours: syncedSystemHoursByDay[date] || 0,
        pendingSystemHours: pendingSystemHoursByDay[date] || 0,
        manualSystemHours: manualSystemHoursByDay[date] || 0,
        artiaEntryCount: artiaEntriesCountByDay[date] || 0
      });
    });

    comparisons.sort((a, b) => b.date.getTime() - a.date.getTime());

    const comparisonsJson = comparisons.map((comparison) => comparison.toJSON());
    const dailyDetails = comparisonsJson.map((comparison) => ({
      ...comparison,
      systemEvents: systemEventsByDay[comparison.date] || [],
      artiaEntries: artiaEntriesByDay[comparison.date] || [],
      remoteOnlyArtiaEntries: remoteOnlyArtiaEntriesByDay[comparison.date] || []
    }));

    const summaries = this.buildProjectAndActivitySummaries({
      comparisons: comparisonsJson,
      systemEvents: serializedSystemEvents,
      artiaEntries: filteredArtiaEntries,
      remoteOnlyEntryIds: new Set(remoteOnlyArtiaEntries.map((entry) => entry.id))
    });

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
      artiaSourceAvailable: Boolean(artiaSnapshot.source),
      artiaSourceTable: artiaSnapshot.source?.tableName || null,
      artiaReadReason: artiaSnapshot.reason,
      projectCount: summaries.projectSummaries.length,
      activityCount: summaries.activitySummaries.length,
      remoteOnlyArtiaEntries: remoteOnlyArtiaEntries.length,
      filtersApplied: {
        startDate: range.startDate,
        endDate: range.endDate,
        project: options.project || null,
        activity: options.activity || null
      }
    };

    return {
      comparisons: comparisonsJson,
      dailyDetails,
      projectSummaries: summaries.projectSummaries,
      activitySummaries: summaries.activitySummaries,
      availableProjects: summaries.availableProjects,
      availableActivities: summaries.availableActivities,
      stats
    };
  }
}
