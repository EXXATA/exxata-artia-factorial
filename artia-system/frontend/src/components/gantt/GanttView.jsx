import { useEffect, useMemo, useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useWorkedHoursComparison } from '../../hooks/useWorkedHoursComparison';
import { useProjects } from '../../hooks/useProjects';
import WorkedHoursRangePanel from '../integration/WorkedHoursRangePanel';
import { getWeekDays, startOfWeekMonday, formatDateISO } from '../../utils/dateUtils';
import { formatWeekRangeLabel, formatWorkedTime } from '../../utils/eventViewUtils';
import { buildProjectWeeklySyncSummary } from '../../utils/artiaSyncUtils';

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function GanttView() {
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(new Date()));
  const [projectFilter, setProjectFilter] = useState('ALL');

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekDayIsos = useMemo(() => weekDays.map((day) => formatDateISO(day)), [weekDays]);
  const startDate = weekDayIsos[0];
  const endDate = weekDayIsos[6];

  const { data: eventsData, isLoading } = useEvents({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined
  });
  const { data: comparisonData } = useWorkedHoursComparison({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    enabled: Boolean(startDate && endDate)
  });
  const { data: projectsData } = useProjects();

  const events = eventsData?.data || [];
  const projects = projectsData?.data || [];
  const rows = useMemo(() => buildProjectWeeklySyncSummary(events, weekDayIsos), [events, weekDayIsos]);
  const comparisonByDay = useMemo(
    () => Object.fromEntries((comparisonData?.dailyDetails || []).map((detail) => [detail.date, detail])),
    [comparisonData]
  );
  const weeklyFactorialHours = useMemo(
    () => (comparisonData?.comparisons || []).reduce((sum, detail) => sum + (detail.factorialHours || 0), 0),
    [comparisonData]
  );
  const remoteOnlyByProjectAndDay = useMemo(() => {
    return (comparisonData?.dailyDetails || []).reduce((accumulator, detail) => {
      (detail.remoteOnlyArtiaEntries || []).forEach((entry) => {
        const projectKey = String(entry.projectNumber || entry.projectId || entry.projectLabel || entry.project || 'Sem projeto');
        const compoundKey = `${projectKey}::${detail.date}`;
        if (!accumulator[compoundKey]) {
          accumulator[compoundKey] = {
            count: 0,
            hours: 0
          };
        }

        accumulator[compoundKey].count += 1;
        accumulator[compoundKey].hours += Number(entry.hours || 0);
      });

      return accumulator;
    }, {});
  }, [comparisonData]);

  useEffect(() => {
    if (projectFilter === 'ALL') {
      return;
    }

    const hasSelectedProject = projects.some((project) => String(project.number) === String(projectFilter));
    if (!hasSelectedProject) {
      setProjectFilter('ALL');
    }
  }, [projectFilter, projects]);

  const handlePrevWeek = () => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    setWeekStart(startOfWeekMonday(new Date()));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ui-empty-state max-w-md px-6 py-5">
          Carregando visão Gantt...
        </div>
      </div>
    );
  }

  return (
    <div className="view-shell">
      <section className="ui-toolbar">
        <div className="ui-toolbar-row">
          <div className="ui-toolbar-group">
            <button onClick={handlePrevWeek} className="app-action-button">
              Sem. anterior
            </button>
            <button onClick={handleToday} className="inline-flex items-center rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-primary-dark hover:bg-primary-dark">
              Hoje
            </button>
            <button onClick={handleNextWeek} className="app-action-button">
              Prox. semana
            </button>
          </div>

          <div className="ui-chip ui-chip-accent text-sm font-semibold">
            {formatWeekRangeLabel(weekStart)}
          </div>

          <div className="ui-toolbar-group">
            <label className="ui-label">Projeto</label>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="ui-input min-w-[240px]">
              <option value="ALL">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.number}>{project.number} - {project.name}{project.active ? '' : ' · Inativo'}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Mostra o total de horas por projeto e por dia na semana atual.</span>
          <span className="ui-chip">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            Factorial {formatWorkedTime(Math.round(weeklyFactorialHours * 60))}
          </span>
          <span className="ui-chip ui-chip-success">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Sincronizado
          </span>
          <span className="ui-chip ui-chip-warning">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Manual
          </span>
          <span className="ui-chip">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            Pendente
          </span>
          <span className="ui-chip ui-chip-violet">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            Somente Artia
          </span>
        </div>
      </section>

      <WorkedHoursRangePanel
        startDate={startDate}
        endDate={endDate}
        project={projectFilter !== 'ALL' ? projectFilter : undefined}
        title="Conciliação diária da semana Gantt"
        subtitle="Base diária para comparar horas do sistema com Artia e Factorial na semana corrente"
      />

      <section className="ui-table-shell">
        <div className="ui-table-scroll">
          <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-sm text-slate-700 dark:text-slate-200">
            <thead className="ui-table-head">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 px-4 py-4 dark:bg-[#111827]">Projeto</th>
                <th className="px-4 py-4">Total Horas na Semana</th>
                {weekDays.map((day, index) => (
                  <th key={index} className="px-4 py-4">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">{DAY_NAMES[index]}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{day.toLocaleDateString('pt-BR')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma hora consolidada para a semana atual.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.project} className="ui-table-row">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-4 font-semibold text-slate-900 dark:border-white/5 dark:bg-[#0f172a] dark:text-white">
                      {row.project}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 dark:border-white/5">
                      <div className="ui-mono text-primary dark:text-primary-light">{formatWorkedTime(row.totalMinutes)}</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        Factorial {formatWorkedTime(Math.round(weekDayIsos.reduce((sum, dayIso) => sum + ((comparisonByDay[dayIso]?.factorialHours || 0) * 60), 0)))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="ui-chip ui-chip-success">Artia {formatWorkedTime(row.syncedMinutes)}</span>
                        {row.manualMinutes > 0 && (
                          <span className="ui-chip ui-chip-warning">Manual {formatWorkedTime(row.manualMinutes)}</span>
                        )}
                        {row.pendingMinutes > 0 && (
                          <span className="ui-chip">Pendente {formatWorkedTime(row.pendingMinutes)}</span>
                        )}
                      </div>
                    </td>
                    {weekDayIsos.map((dayIso) => {
                      const daySummary = row.byDay[dayIso] || {
                        totalMinutes: 0,
                        syncedMinutes: 0,
                        pendingMinutes: 0,
                        manualMinutes: 0
                      };
                      const minutes = daySummary.totalMinutes;
                      const width = row.totalMinutes ? Math.max((minutes / row.totalMinutes) * 100, minutes > 0 ? 10 : 0) : 0;
                      const syncedWidth = minutes ? (daySummary.syncedMinutes / minutes) * 100 : 0;
                      const manualWidth = minutes ? (daySummary.manualMinutes / minutes) * 100 : 0;
                      const pendingOnlyMinutes = Math.max(0, daySummary.pendingMinutes - daySummary.manualMinutes);
                      const pendingWidth = minutes ? (pendingOnlyMinutes / minutes) * 100 : 0;
                      const remoteOnlyInfo = remoteOnlyByProjectAndDay[`${row.project}::${dayIso}`] || null;
                      const factorialHours = comparisonByDay[dayIso]?.factorialHours || 0;

                      return (
                        <td key={dayIso} className="border-b border-slate-100 px-4 py-4 dark:border-white/5">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#111827]">
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
                              <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${width}%` }}>
                                <div className="h-full bg-emerald-400" style={{ width: `${syncedWidth}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${manualWidth}%` }} />
                                <div className="h-full bg-sky-400" style={{ width: `${pendingWidth}%` }} />
                              </div>
                            </div>
                            <div className={`mt-2 text-xs font-semibold ${minutes > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-500'}`}>
                              {formatWorkedTime(minutes)}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500">
                              F {formatWorkedTime(Math.round(factorialHours * 60))}
                            </div>
                            {minutes > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                {daySummary.syncedMinutes > 0 && <span>A {formatWorkedTime(daySummary.syncedMinutes)}</span>}
                                {daySummary.manualMinutes > 0 && <span>M {formatWorkedTime(daySummary.manualMinutes)}</span>}
                                {pendingOnlyMinutes > 0 && <span>P {formatWorkedTime(pendingOnlyMinutes)}</span>}
                              </div>
                            )}
                            {remoteOnlyInfo?.count ? (
                              <div className="mt-1 text-[10px] text-violet-700 dark:text-violet-300">
                                Só Artia {remoteOnlyInfo.count} · {formatWorkedTime(Math.round(remoteOnlyInfo.hours * 60))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
