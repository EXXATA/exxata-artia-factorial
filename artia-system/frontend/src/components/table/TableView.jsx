import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WorkspacePage from '../layout/WorkspacePage';
import { useProjects } from '../../hooks/useProjects';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';
import TableDetailTable from './TableDetailTable';
import TableSummaryTable from './TableSummaryTable';
import TableViewToolbar from './TableViewToolbar';
import { useWeekViewData } from '../../hooks/useWeekViewData';
import { useRangeSummaryView } from '../../hooks/useRangeSummaryView';
import { formatDateISO, startOfWeekMonday, addDays } from '../../utils/dateUtils';
import {
  mergeActivityFilterOptions,
  mergeProjectFilterOptions
} from '../../utils/viewFilterOptions';
import { getActiveViewFilterValue, reconcileProjectAndActivityFilters } from '../../utils/viewFilterState.js';
import { getInclusiveDaySpan, sortRowsByDayAndStart } from './tableViewUtils';
import { getPreferredInlineDay } from './tableEditingUtils.js';

const EventModal = lazy(() => import('../calendar/EventModal'));
const ArtiaRemoteEntriesModal = lazy(() => import('../calendar/ArtiaRemoteEntriesModal'));
const ImportModal = lazy(() => import('../import/ImportModal'));

function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div className="ui-surface relative z-10 px-6 py-5">
        Carregando detalhes...
      </div>
    </div>
  );
}

export default function TableView() {
  const initialWeekStart = startOfWeekMonday(new Date());
  const [startDate, setStartDate] = useState(formatDateISO(initialWeekStart));
  const [endDate, setEndDate] = useState(formatDateISO(addDays(initialWeekStart, 6)));
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [draftEvent, setDraftEvent] = useState(null);
  const [selectedRemoteEntries, setSelectedRemoteEntries] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const daySpan = useMemo(() => getInclusiveDaySpan(startDate, endDate), [endDate, startDate]);
  const isDetailedMode = daySpan > 0 && daySpan <= 7;
  const refreshTimeoutRef = useRef(null);
  const detailTableRef = useRef(null);

  const detailQuery = useWeekViewData({
    startDate,
    endDate,
    projectKey: getActiveViewFilterValue(projectFilter),
    activityKey: getActiveViewFilterValue(activityFilter),
    enabled: isDetailedMode
  });
  const summaryQuery = useRangeSummaryView({
    startDate,
    endDate,
    projectKey: getActiveViewFilterValue(projectFilter),
    activityKey: getActiveViewFilterValue(activityFilter),
    enabled: !isDetailedMode
  });
  const { data: projectsData } = useProjects();

  const activeQuery = isDetailedMode ? detailQuery : summaryQuery;
  const activeRefreshRef = useRef(activeQuery.refresh);

  useEffect(() => {
    activeRefreshRef.current = activeQuery.refresh;
  }, [activeQuery.refresh]);

  useEffect(() => () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
  }, []);

  const scheduleActiveRefresh = useCallback((delayMs = 650) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      activeRefreshRef.current?.();
    }, delayMs);
  }, []);

  const handlePersistedChange = useCallback((persistedEvent, operationType, committedFields = []) => {
    if (operationType === 'create') {
      scheduleActiveRefresh();
      return;
    }

    if (committedFields.some((field) => (
      field === 'day'
      || field === 'startTime'
      || field === 'endTime'
      || field === 'project'
      || field === 'activityLabel'
    ))) {
      scheduleActiveRefresh();
      return;
    }

    if (committedFields.length > 0) {
      scheduleActiveRefresh(2400);
    }
  }, [scheduleActiveRefresh]);

  useRegisterGlobalAction({
    id: `table:${startDate}:${endDate}:${projectFilter}:${activityFilter}:${isDetailedMode ? 'detail' : 'summary'}`,
    label: 'Atualizar tabela atual',
    run: activeQuery.refresh
  });

  const activeData = activeQuery.data || null;
  const projectCatalog = projectsData?.data || [];
  const projectOptions = useMemo(
    () => mergeProjectFilterOptions({
      catalogProjects: projectCatalog,
      availableProjects: activeData?.availableProjects || []
    }),
    [activeData?.availableProjects, projectCatalog]
  );
  const activityOptions = useMemo(
    () => mergeActivityFilterOptions({
      catalogProjects: projectCatalog,
      availableActivities: activeData?.availableActivities || [],
      selectedProjectKey: projectFilter
    }),
    [activeData?.availableActivities, projectCatalog, projectFilter]
  );
  const dailyDetails = activeData?.dailyDetails || [];
  const dailyDetailsByDate = useMemo(
    () => Object.fromEntries(dailyDetails.map((detail) => [detail.date, detail])),
    [dailyDetails]
  );
  const events = useMemo(
    () => [...(isDetailedMode ? activeData?.events || [] : [])].sort(sortRowsByDayAndStart),
    [activeData, isDetailedMode]
  );

  useEffect(() => {
    const nextFilters = reconcileProjectAndActivityFilters({
      projectFilter,
      activityFilter,
      projectOptions,
      activityOptions
    });

    if (nextFilters.projectFilter !== projectFilter) {
      setProjectFilter(nextFilters.projectFilter);
      setActivityFilter(nextFilters.activityFilter);
      return;
    }

    if (nextFilters.activityFilter !== activityFilter) {
      setActivityFilter(nextFilters.activityFilter);
    }
  }, [activityFilter, activityOptions, projectFilter, projectOptions]);

  useEffect(() => {
    setSelectedEvent(null);
    setSelectedRemoteEntries([]);
  }, [isDetailedMode]);

  useEffect(() => {
    detailTableRef.current?.clearEditingState?.();
  }, [startDate, endDate, projectFilter, activityFilter, isDetailedMode]);

  const isEventModalOpen = Boolean(selectedEvent || draftEvent);
  const isRemoteEntriesModalOpen = selectedRemoteEntries.length > 0;

  const handleSelectSystemEvent = useCallback((event) => {
    detailTableRef.current?.clearEditingState?.();
    setDraftEvent(null);
    setSelectedEvent(event);
  }, []);

  const handleSelectRemoteEvent = useCallback((event) => {
    detailTableRef.current?.clearEditingState?.();
    setSelectedRemoteEntries([event]);
  }, []);

  const handleOpenImport = useCallback(() => {
    detailTableRef.current?.clearEditingState?.();
    setIsImportModalOpen(true);
  }, []);

  const handleOpenNewEvent = useCallback(() => {
    const todayIso = formatDateISO(new Date());
    const day = todayIso >= startDate && todayIso <= endDate ? todayIso : startDate;
    detailTableRef.current?.clearEditingState?.();
    setSelectedEvent(null);
    setDraftEvent({ day, startTime: '08:00', endTime: '08:50' });
  }, [endDate, startDate]);

  const handleInsertInlineRow = useCallback(() => {
    const preferredDay = getPreferredInlineDay({
      startDate,
      endDate,
      todayIso: formatDateISO(new Date())
    });

    setSelectedEvent(null);
    setDraftEvent(null);
    setSelectedRemoteEntries([]);
    detailTableRef.current?.insertInlineRow?.(preferredDay);
  }, [endDate, startDate]);

  if (activeQuery.isLoading && !activeData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ui-empty-state max-w-md px-6 py-5">
          Carregando tabela...
        </div>
      </div>
    );
  }

  return (
    <WorkspacePage
      toolbar={(
        <TableViewToolbar
          startDate={startDate}
          endDate={endDate}
          projectFilter={projectFilter}
          activityFilter={activityFilter}
          projectOptions={projectOptions}
          activityOptions={activityOptions}
          isDetailedMode={isDetailedMode}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onProjectFilterChange={(value) => {
            setProjectFilter(value);
            setActivityFilter('ALL');
          }}
          onActivityFilterChange={setActivityFilter}
          onOpenImport={handleOpenImport}
          onInsertInlineRow={handleInsertInlineRow}
          onOpenNewEvent={handleOpenNewEvent}
        />
      )}
    >
      {activeQuery.isError ? (
        <div className="ui-banner-danger text-sm">
          {activeQuery.error?.message || 'Erro ao carregar a tabela do periodo.'}
        </div>
      ) : null}

      {isDetailedMode ? (
        <TableDetailTable
          ref={detailTableRef}
          dailyDetails={dailyDetails}
          dailyDetailsByDate={dailyDetailsByDate}
          events={events}
          projects={projectCatalog}
          onPersistedChange={handlePersistedChange}
          onSelectEvent={handleSelectSystemEvent}
          onSelectRemoteEntry={handleSelectRemoteEvent}
        />
      ) : (
        <TableSummaryTable dailyDetails={dailyDetails} />
      )}

      {isEventModalOpen ? (
        <Suspense fallback={<ModalLoadingFallback />}>
          <EventModal
            isOpen={isEventModalOpen}
            onClose={() => {
              setSelectedEvent(null);
              setDraftEvent(null);
            }}
            event={selectedEvent}
            draft={draftEvent}
          />
        </Suspense>
      ) : null}

      {isRemoteEntriesModalOpen ? (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ArtiaRemoteEntriesModal
            isOpen={isRemoteEntriesModalOpen}
            onClose={() => setSelectedRemoteEntries([])}
            entries={selectedRemoteEntries}
            title="Lancamento remoto do Artia"
            subtitle="Visualizacao somente leitura do lancamento remoto encontrado via MySQL."
          />
        </Suspense>
      ) : null}

      {isImportModalOpen ? (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onApplied={() => {
              setIsImportModalOpen(false);
            }}
          />
        </Suspense>
      ) : null}
    </WorkspacePage>
  );
}
