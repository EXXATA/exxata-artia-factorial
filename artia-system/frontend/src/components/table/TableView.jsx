import { useEffect, useMemo, useState } from 'react';
import EventModal from '../calendar/EventModal';
import WorkedHoursRangePanel from '../integration/WorkedHoursRangePanel';
import { useEvents } from '../../hooks/useEvents';
import { useWorkedHoursComparison } from '../../hooks/useWorkedHoursComparison';
import { useProjects } from '../../hooks/useProjects';
import { formatDateBR, formatDateISO, startOfWeekMonday, addDays } from '../../utils/dateUtils';
import { extractTimeValue, formatWorkedTime, getEventMinutesByDay } from '../../utils/eventViewUtils';
import { getArtiaSyncPresentation } from '../../utils/artiaSyncUtils';
import { calculateDuration } from '../../utils/timeUtils';

export default function TableView() {
  const initialWeekStart = startOfWeekMonday(new Date());
  const [startDate, setStartDate] = useState(formatDateISO(initialWeekStart));
  const [endDate, setEndDate] = useState(formatDateISO(addDays(initialWeekStart, 6)));
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [draftEvent, setDraftEvent] = useState(null);

  const { data: eventsData, isLoading } = useEvents({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined
  });
  const { data: comparisonData } = useWorkedHoursComparison({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    activity: activityFilter !== 'ALL' ? activityFilter : undefined,
    enabled: Boolean(startDate && endDate)
  });
  const { data: projectsData } = useProjects();

  const events = eventsData?.data || [];
  const projects = projectsData?.data || [];

  const availableActivities = useMemo(() => {
    if (projectFilter !== 'ALL') {
      const project = projects.find((item) => String(item.number) === String(projectFilter));
      return project?.activities || [];
    }

    return projects.flatMap((project) => project.activities || []);
  }, [projectFilter, projects]);

  useEffect(() => {
    if (projectFilter === 'ALL') {
      return;
    }

    const hasSelectedProject = projects.some((project) => String(project.number) === String(projectFilter));
    if (!hasSelectedProject) {
      setProjectFilter('ALL');
      setActivityFilter('ALL');
    }
  }, [projectFilter, projects]);

  useEffect(() => {
    if (activityFilter === 'ALL') {
      return;
    }

    const hasSelectedActivity = availableActivities.some((activity) => String(activity.label) === String(activityFilter));
    if (!hasSelectedActivity) {
      setActivityFilter('ALL');
    }
  }, [activityFilter, availableActivities]);

  const filteredEvents = useMemo(() => {
    const normalizedActivityFilter = activityFilter.trim().toLowerCase();

    return [...events]
      .filter((event) => {
        if (activityFilter === 'ALL') return true;
        return event.activityLabel?.trim().toLowerCase() === normalizedActivityFilter;
      })
      .sort((a, b) => {
        const byDay = a.day.localeCompare(b.day);
        if (byDay !== 0) return byDay;
        return new Date(a.start) - new Date(b.start);
      });
  }, [activityFilter, events]);

  const dailyDetailsByDate = useMemo(
    () => Object.fromEntries((comparisonData?.dailyDetails || []).map((detail) => [detail.date, detail])),
    [comparisonData]
  );

  const remoteOnlyRows = useMemo(() => {
    return (comparisonData?.dailyDetails || [])
      .flatMap((detail) => (detail.remoteOnlyArtiaEntries || []).map((entry) => ({
        rowType: 'artia_only',
        day: detail.date,
        id: entry.id,
        project: entry.projectLabel || entry.project || 'Projeto Artia',
        start: entry.start,
        end: entry.end,
        effortMinutes: Math.round((Number(entry.hours) || 0) * 60),
        activityLabel: entry.activity || 'Atividade Artia',
        notes: entry.notes || '',
        activityId: entry.activityId || '—',
        sourceStatus: entry.status || 'Somente Artia',
        artiaRemoteEntryId: entry.id,
        artiaRemoteHours: entry.hours || 0
      })))
      .sort((a, b) => {
        const byDay = a.day.localeCompare(b.day);
        if (byDay !== 0) return byDay;
        return new Date(a.start) - new Date(b.start);
      });
  }, [comparisonData]);

  const minutesByDay = useMemo(() => getEventMinutesByDay(filteredEvents), [filteredEvents]);
  const tableRows = useMemo(() => {
    const systemRows = filteredEvents.map((event) => ({
      rowType: 'system',
      ...event,
      effortMinutes: calculateDuration(event.start, event.end)
    }));

    return [...systemRows, ...remoteOnlyRows].sort((a, b) => {
      const byDay = a.day.localeCompare(b.day);
      if (byDay !== 0) return byDay;
      return new Date(a.start) - new Date(b.start);
    });
  }, [filteredEvents, remoteOnlyRows]);

  const handleNewEvent = () => {
    const todayIso = formatDateISO(new Date());
    const day = todayIso >= startDate && todayIso <= endDate ? todayIso : startDate;

    setSelectedEvent(null);
    setDraftEvent({ day, startTime: '08:00', endTime: '08:50' });
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setDraftEvent(null);
  };

  if (isLoading) {
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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ui-input" />
            <label className="ui-label">Até</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="ui-input" />
            <label className="ui-label">Projeto</label>
            <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setActivityFilter('ALL'); }} className="ui-input min-w-[220px]">
              <option value="ALL">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.number}>{project.number} - {project.name}{project.active ? '' : ' · Inativo'}</option>
              ))}
            </select>
            <label className="ui-label">Atividade</label>
            <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="ui-input min-w-[220px]">
              <option value="ALL">Todas as atividades</option>
              {availableActivities.map((activity) => (
                <option key={`${activity.projectId}-${activity.id}`} value={activity.label}>{activity.label}</option>
              ))}
            </select>
          </div>

          <button onClick={handleNewEvent} className="inline-flex items-center rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:border-primary-dark hover:bg-primary-dark">
            + Novo apontamento
          </button>
        </div>
      </section>

      <WorkedHoursRangePanel
        startDate={startDate}
        endDate={endDate}
        project={projectFilter !== 'ALL' ? projectFilter : undefined}
        activity={activityFilter !== 'ALL' ? activityFilter : undefined}
        title="Conciliação diária da tabela"
        subtitle="Comparação diária aplicada ao mesmo intervalo filtrado da tabela"
      />

      <section className="ui-table-shell">
        <div className="ui-table-scroll">
          <table className="min-w-full border-collapse text-sm text-slate-700 dark:text-slate-200">
            <thead className="ui-table-head">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Projeto</th>
                <th className="px-4 py-3">Hora Início</th>
                <th className="px-4 py-3">Hora de Término</th>
                <th className="px-4 py-3">Esforço</th>
                <th className="px-4 py-3">Esforço Dia</th>
                <th className="px-4 py-3">Factorial Dia</th>
                <th className="px-4 py-3">Atividade</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Status Artia</th>
                <th className="px-4 py-3">Registro Artia</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    Nenhum apontamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                tableRows.map((event) => {
                  const effort = event.effortMinutes;
                  const syncPresentation = event.rowType === 'system'
                    ? getArtiaSyncPresentation(event.artiaSyncStatus)
                    : {
                      label: 'Somente Artia',
                      badgeClassName: 'border-violet-400/30 bg-violet-500/10 text-violet-100'
                    };
                  const dayComparison = dailyDetailsByDate[event.day] || null;

                  return (
                    <tr
                      key={`${event.rowType}-${event.id}`}
                      onClick={() => {
                        if (event.rowType !== 'system') {
                          return;
                        }

                        setDraftEvent(null);
                        setSelectedEvent(event);
                      }}
                      className={`ui-table-row ${event.rowType === 'system' ? 'cursor-pointer' : 'bg-violet-50 dark:bg-violet-500/5'}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{formatDateBR(event.day)}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 ${event.rowType === 'system' ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200' : 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100'}`}>
                          {event.rowType === 'system' ? 'Sistema' : 'Artia'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{event.project}</td>
                      <td className="px-4 py-3 ui-mono">{extractTimeValue(event.start)}</td>
                      <td className="px-4 py-3 ui-mono">{extractTimeValue(event.end)}</td>
                      <td className="px-4 py-3 ui-mono text-primary dark:text-primary-light">{formatWorkedTime(effort)}</td>
                      <td className="px-4 py-3 ui-mono text-emerald-700 dark:text-emerald-200">{formatWorkedTime(minutesByDay[event.day] || 0)}</td>
                      <td className="px-4 py-3 ui-mono text-slate-600 dark:text-slate-300">{formatWorkedTime(Math.round((dayComparison?.factorialHours || 0) * 60))}</td>
                      <td className="px-4 py-3">{event.activityLabel}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-slate-500 dark:text-slate-400">{event.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${syncPresentation.badgeClassName}`}>
                          {syncPresentation.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {event.artiaRemoteEntryId ? (
                          <div className="space-y-1">
                            <div className="ui-mono text-emerald-700 dark:text-emerald-100">{event.artiaRemoteEntryId}</div>
                            {event.artiaRemoteHours > 0 && <div>{event.artiaRemoteHours.toFixed(2)}h</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">{event.rowType === 'system' ? (event.artiaSourceAvailable ? 'Não encontrado' : 'Leitura indisponível') : '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{event.activityId || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="text-sm text-slate-500 dark:text-slate-400">Dica: clique em uma linha para editar o evento.</div>

      <EventModal isOpen={Boolean(selectedEvent || draftEvent)} onClose={closeModal} event={selectedEvent} draft={draftEvent} />
    </div>
  );
}
