import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import WorkedHoursRangePanel from '../integration/WorkedHoursRangePanel';
import { useProjects } from '../../hooks/useProjects';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';
import TableDetailTable from './TableDetailTable';
import TableSummaryTable from './TableSummaryTable';
import { useWeekViewData } from '../../hooks/useWeekViewData';
import { useRangeSummaryView } from '../../hooks/useRangeSummaryView';
import { formatDateISO, startOfWeekMonday, addDays } from '../../utils/dateUtils';
import { getEventMinutesByDay } from '../../utils/eventViewUtils';
import { calculateDuration } from '../../utils/timeUtils';
import { formatProjectOptionLabel, normalizeProjectCatalogActivityOptions, normalizeProjectCatalogOptions } from '../../utils/viewFilterOptions';
import { buildRemoteOnlyRows, getInclusiveDaySpan, sortRowsByDayAndStart } from './tableViewUtils';

const EventModal = lazy(() => import('../calendar/EventModal'));
const ArtiaRemoteEntriesModal = lazy(() => import('../calendar/ArtiaRemoteEntriesModal'));

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

  const daySpan = useMemo(() => getInclusiveDaySpan(startDate, endDate), [endDate, startDate]);
  const isDetailedMode = daySpan > 0 && daySpan <= 7;

  const detailQuery = useWeekViewData({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    activity: activityFilter !== 'ALL' ? activityFilter : undefined,
    enabled: isDetailedMode
  });
  const summaryQuery = useRangeSummaryView({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    activity: activityFilter !== 'ALL' ? activityFilter : undefined,
    enabled: !isDetailedMode
  });
  const { data: projectsData } = useProjects();

  const activeQuery = isDetailedMode ? detailQuery : summaryQuery;
  useRegisterGlobalAction({
    id: `table:${startDate}:${endDate}:${projectFilter}:${activityFilter}:${isDetailedMode ? 'detail' : 'summary'}`,
    label: 'Atualizar tabela atual',
    run: activeQuery.refresh
  });
  const activeData = activeQuery.data || null;
  const projectCatalog = projectsData?.data || [];
  const projectOptions = useMemo(
    () => normalizeProjectCatalogOptions(projectCatalog),
    [projectCatalog]
  );
  const activityOptions = useMemo(
    () => normalizeProjectCatalogActivityOptions(projectCatalog, projectFilter),
    [projectCatalog, projectFilter]
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
  const detailRows = useMemo(() => {
    const systemRows = events.map((event) => ({
      rowType: 'system',
      ...event,
      effortMinutes: calculateDuration(event.start, event.end)
    }));

    return [...systemRows, ...buildRemoteOnlyRows(dailyDetails)].sort(sortRowsByDayAndStart);
  }, [dailyDetails, events]);
  const minutesByDay = useMemo(() => getEventMinutesByDay(events), [events]);

  useEffect(() => {
    if (projectFilter !== 'ALL' && !projectOptions.some((project) => String(project.number) === String(projectFilter))) {
      setProjectFilter('ALL');
      setActivityFilter('ALL');
    }
  }, [projectFilter, projectOptions]);

  useEffect(() => {
    if (activityFilter !== 'ALL' && !activityOptions.some((activity) => activity.value === activityFilter)) {
      setActivityFilter('ALL');
    }
  }, [activityFilter, activityOptions]);

  useEffect(() => {
    setSelectedEvent(null);
    setSelectedRemoteEntries([]);
  }, [isDetailedMode]);

  const isEventModalOpen = Boolean(selectedEvent || draftEvent);
  const isRemoteEntriesModalOpen = selectedRemoteEntries.length > 0;

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
    <div className="view-shell">
      <section className="ui-toolbar">
        <div className="ui-toolbar-row">
          <div className="ui-toolbar-group">
            <label className="ui-label">De</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="ui-input" />
            <label className="ui-label">Ate</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="ui-input" />
            <label className="ui-label">Projeto</label>
            <select value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setActivityFilter('ALL'); }} className="ui-input min-w-[220px]">
              <option value="ALL">Todos os projetos</option>
              {projectOptions.map((project) => (
                <option key={project.key} value={project.number}>{formatProjectOptionLabel(project)}</option>
              ))}
            </select>
            <label className="ui-label">Atividade</label>
            <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)} className="ui-input min-w-[220px]">
              <option value="ALL">Todas as atividades</option>
              {activityOptions.map((activity) => (
                <option key={activity.key} value={activity.value}>{activity.label}</option>
              ))}
            </select>
          </div>

          <button onClick={() => {
            const todayIso = formatDateISO(new Date());
            const day = todayIso >= startDate && todayIso <= endDate ? todayIso : startDate;
            setSelectedEvent(null);
            setDraftEvent({ day, startTime: '08:00', endTime: '08:50' });
          }} className="inline-flex items-center rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:border-primary-dark hover:bg-primary-dark">
            + Novo apontamento
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className={`ui-chip ${isDetailedMode ? 'ui-chip-success' : 'ui-chip-accent'}`}>
            {isDetailedMode ? 'Modo detalhado' : 'Modo agregado'}
          </span>
          <span>
            {isDetailedMode
              ? 'Intervalos de ate 7 dias usam a leitura detalhada com eventos e lancamentos remotos.'
              : 'Periodos acima de 7 dias usam resumo diario para manter a resposta rapida.'}
          </span>
        </div>
      </section>

      <WorkedHoursRangePanel
        startDate={startDate}
        endDate={endDate}
        stats={activeData?.stats || null}
        isLoading={activeQuery.isLoading && !activeData}
        isFetching={activeQuery.isFetching}
        onRefresh={activeQuery.refresh}
        project={projectFilter !== 'ALL' ? projectFilter : undefined}
        activity={activityFilter !== 'ALL' ? activityFilter : undefined}
        title={isDetailedMode ? 'Conciliacao diaria da tabela' : 'Conciliacao diaria do periodo agregado'}
        subtitle={isDetailedMode
          ? 'Comparacao diaria aplicada ao mesmo intervalo filtrado da tabela detalhada'
          : 'Comparacao diaria agregada para o mesmo periodo filtrado da tabela'}
      />

      {isDetailedMode ? (
        <TableDetailTable
          dailyDetailsByDate={dailyDetailsByDate}
          minutesByDay={minutesByDay}
          rows={detailRows}
          onSelectEvent={(event) => {
            setDraftEvent(null);
            setSelectedEvent(event);
          }}
          onSelectRemoteEntry={(event) => setSelectedRemoteEntries([event])}
        />
      ) : (
        <TableSummaryTable dailyDetails={dailyDetails} />
      )}

      <div className="text-sm text-slate-500 dark:text-slate-400">
        {isDetailedMode
          ? 'Clique em uma linha do sistema para editar ou em uma linha do Artia para consultar o lancamento remoto.'
          : 'O detalhamento evento a evento fica disponivel apenas em intervalos de ate 7 dias.'}
      </div>

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
    </div>
  );
}
