import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchWeekViewData, useWeekViewData } from '../../hooks/useWeekViewData';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';
import WorkedHoursRangePanel from '../integration/WorkedHoursRangePanel';
import GanttWeeklyTable from './GanttWeeklyTable';
import { addDays, getWeekDays, startOfWeekMonday, formatDateISO } from '../../utils/dateUtils';
import { formatWeekRangeLabel, formatWorkedTime } from '../../utils/eventViewUtils';
import { buildProjectWeeklyComparisonRows } from '../../utils/artiaSyncUtils';
import { formatProjectOptionLabel, normalizeAvailableProjectOptions } from '../../utils/viewFilterOptions';
import { buildComparisonByDay, getWeeklyFactorialHours } from './ganttViewUtils';

export default function GanttView() {
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(new Date()));
  const [projectFilter, setProjectFilter] = useState('ALL');
  const queryClient = useQueryClient();

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekDayIsos = useMemo(() => weekDays.map((day) => formatDateISO(day)), [weekDays]);
  const startDate = weekDayIsos[0];
  const endDate = weekDayIsos[6];

  const weekQuery = useWeekViewData({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined
  });
  useRegisterGlobalAction({
    id: `gantt:${startDate}:${endDate}:${projectFilter}`,
    label: 'Atualizar visão Gantt',
    run: weekQuery.refresh
  });
  const allProjectsWeekQuery = useWeekViewData({ startDate, endDate });

  const comparisonData = weekQuery.data || null;
  const filterSourceData = allProjectsWeekQuery.data || comparisonData;
  const projectOptions = useMemo(
    () => normalizeAvailableProjectOptions(filterSourceData?.availableProjects || []),
    [filterSourceData]
  );
  const rows = useMemo(
    () => buildProjectWeeklyComparisonRows(comparisonData?.projectSummaries || [], weekDayIsos),
    [comparisonData, weekDayIsos]
  );
  const comparisonByDay = useMemo(() => buildComparisonByDay(comparisonData), [comparisonData]);
  const weeklyFactorialHours = useMemo(() => getWeeklyFactorialHours(comparisonData), [comparisonData]);

  useEffect(() => {
    if (!weekQuery.userScopeKey || weekDays.length === 0) {
      return;
    }

    void prefetchWeekViewData(queryClient, weekQuery.userScopeKey, {
      startDate: formatDateISO(addDays(weekDays[0], -7)),
      endDate: formatDateISO(addDays(weekDays[6], -7)),
      project: projectFilter !== 'ALL' ? projectFilter : undefined
    });
    void prefetchWeekViewData(queryClient, weekQuery.userScopeKey, {
      startDate: formatDateISO(addDays(weekDays[0], 7)),
      endDate: formatDateISO(addDays(weekDays[6], 7)),
      project: projectFilter !== 'ALL' ? projectFilter : undefined
    });
  }, [projectFilter, queryClient, weekDays, weekQuery.userScopeKey]);

  useEffect(() => {
    if (projectFilter === 'ALL') {
      return;
    }

    const hasSelectedProject = projectOptions.some((project) => String(project.number) === String(projectFilter));
    if (!hasSelectedProject) {
      setProjectFilter('ALL');
    }
  }, [projectFilter, projectOptions]);

  if (weekQuery.isLoading && !comparisonData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ui-empty-state max-w-md px-6 py-5">
          Carregando visao Gantt...
        </div>
      </div>
    );
  }

  return (
    <div className="view-shell">
      <section className="ui-toolbar">
        <div className="ui-toolbar-row">
          <div className="ui-toolbar-group">
            <button onClick={() => setWeekStart((current) => addDays(current, -7))} disabled={weekQuery.isFetching} className="app-action-button disabled:opacity-50">
              Sem. anterior
            </button>
            <button onClick={() => setWeekStart(startOfWeekMonday(new Date()))} disabled={weekQuery.isFetching} className="inline-flex items-center rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-primary-dark hover:bg-primary-dark disabled:opacity-50">
              Hoje
            </button>
            <button onClick={() => setWeekStart((current) => addDays(current, 7))} disabled={weekQuery.isFetching} className="app-action-button disabled:opacity-50">
              Prox. semana
            </button>
          </div>

          <div className="ui-chip ui-chip-accent text-sm font-semibold">
            {formatWeekRangeLabel(weekStart)}
          </div>

          <div className="ui-toolbar-group">
            <label className="ui-label">Projeto</label>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="ui-input min-w-[240px]">
              <option value="ALL">Todos os projetos</option>
              {projectOptions.map((project) => (
                <option key={project.key} value={project.number}>{formatProjectOptionLabel(project)}</option>
              ))}
            </select>
          </div>

          {weekQuery.isFetching ? (
            <div className="ui-chip ui-chip-accent">
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Atualizando semana
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Mostra o total semanal por projeto com sistema e lancamentos somente Artia.</span>
          <span className="ui-chip">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            Factorial {formatWorkedTime(Math.round(weeklyFactorialHours * 60))}
          </span>
          <span className="ui-chip ui-chip-success"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Sincronizado</span>
          <span className="ui-chip ui-chip-warning"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Manual</span>
          <span className="ui-chip"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Pendente</span>
          <span className="ui-chip ui-chip-violet"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" />Somente Artia</span>
        </div>
      </section>

      <WorkedHoursRangePanel
        startDate={startDate}
        endDate={endDate}
        stats={comparisonData?.stats || null}
        isLoading={weekQuery.isLoading && !comparisonData}
        isFetching={weekQuery.isFetching}
        onRefresh={weekQuery.refresh}
        project={projectFilter !== 'ALL' ? projectFilter : undefined}
        title="Conciliacao diaria da semana Gantt"
        subtitle="Base diaria para comparar horas do sistema com Artia e Factorial na semana corrente"
      />

      <GanttWeeklyTable
        comparisonByDay={comparisonByDay}
        rows={rows}
        weekDayIsos={weekDayIsos}
        weekDays={weekDays}
        weekFactorialMinutes={Math.round(weeklyFactorialHours * 60)}
      />
    </div>
  );
}
