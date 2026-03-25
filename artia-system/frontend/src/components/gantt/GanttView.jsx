import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import WorkspacePage from '../layout/WorkspacePage';
import { useProjects } from '../../hooks/useProjects';
import { prefetchWeekViewData, useWeekViewData } from '../../hooks/useWeekViewData';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';
import GanttWeeklyTable from './GanttWeeklyTable';
import { addDays, getWeekDays, startOfWeekMonday, formatDateISO } from '../../utils/dateUtils';
import { formatWeekRangeLabel, formatWorkedTime } from '../../utils/eventViewUtils';
import { buildProjectWeeklyComparisonRows } from '../../utils/artiaSyncUtils';
import { formatProjectOptionLabel, normalizeProjectCatalogOptions } from '../../utils/viewFilterOptions';
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
  const { data: projectsData } = useProjects();

  useRegisterGlobalAction({
    id: `gantt:${startDate}:${endDate}:${projectFilter}`,
    label: 'Atualizar visao Gantt',
    run: weekQuery.refresh
  });

  const comparisonData = weekQuery.data || null;
  const projectCatalog = projectsData?.data || [];
  const projectOptions = useMemo(
    () => normalizeProjectCatalogOptions(projectCatalog),
    [projectCatalog]
  );
  const rows = useMemo(
    () => buildProjectWeeklyComparisonRows(comparisonData?.projectSummaries || [], weekDayIsos),
    [comparisonData, weekDayIsos]
  );
  const comparisonByDay = useMemo(() => buildComparisonByDay(comparisonData), [comparisonData]);
  const weeklyFactorialHours = useMemo(() => getWeeklyFactorialHours(comparisonData), [comparisonData]);
  const prefetchAdjacentWeek = (offsetDays) => {
    if (!weekQuery.userScopeKey || weekDays.length === 0) {
      return;
    }

    void prefetchWeekViewData(queryClient, weekQuery.userScopeKey, {
      startDate: formatDateISO(addDays(weekDays[0], offsetDays)),
      endDate: formatDateISO(addDays(weekDays[6], offsetDays)),
      project: projectFilter !== 'ALL' ? projectFilter : undefined
    });
  };

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

  const toolbar = (
    <section className="ui-toolbar">
      <div className="ui-toolbar-row">
        <div className="ui-toolbar-group">
          <button
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            onMouseEnter={() => prefetchAdjacentWeek(-7)}
            onFocus={() => prefetchAdjacentWeek(-7)}
            disabled={weekQuery.isFetching}
            className="app-action-button disabled:opacity-50"
          >
            Sem. anterior
          </button>
          <button
            onClick={() => setWeekStart(startOfWeekMonday(new Date()))}
            disabled={weekQuery.isFetching}
            className="inline-flex items-center rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-primary-dark hover:bg-primary-dark disabled:opacity-50"
          >
            Hoje
          </button>
          <button
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            onMouseEnter={() => prefetchAdjacentWeek(7)}
            onFocus={() => prefetchAdjacentWeek(7)}
            disabled={weekQuery.isFetching}
            className="app-action-button disabled:opacity-50"
          >
            Prox. semana
          </button>
        </div>

        <div className="ui-toolbar-group">
          <span className="ui-chip ui-chip-accent text-sm font-semibold">
            {formatWeekRangeLabel(weekStart)}
          </span>

          <label className="ui-label">Projeto</label>
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="ui-input min-w-[240px]">
            <option value="ALL">Todos os projetos</option>
            {projectOptions.map((project) => (
              <option key={project.key} value={project.number}>{formatProjectOptionLabel(project)}</option>
            ))}
          </select>

          {weekQuery.isFetching ? (
            <div className="ui-chip ui-chip-accent">
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Atualizando semana
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );

  return (
    <WorkspacePage
      toolbar={toolbar}
    >
      <GanttWeeklyTable
        comparisonByDay={comparisonByDay}
        rows={rows}
        weekDayIsos={weekDayIsos}
        weekDays={weekDays}
        weekFactorialMinutes={Math.round(weeklyFactorialHours * 60)}
      />
    </WorkspacePage>
  );
}
