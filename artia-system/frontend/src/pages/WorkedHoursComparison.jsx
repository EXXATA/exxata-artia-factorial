import { useEffect, useMemo, useState } from 'react';
import Button from '../components/common/Button/Button';
import { useWorkedHoursComparison } from '../hooks/useWorkedHoursComparison';
import { useProjects } from '../hooks/useProjects';

function getDefaultRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

export default function WorkedHoursComparison() {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const { data: projectsData } = useProjects();
  const { data, isLoading, isError, error, refetch, isFetching } = useWorkedHoursComparison({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    activity: activityFilter !== 'ALL' ? activityFilter : undefined
  });

  const projects = projectsData?.data || [];
  const stats = data?.stats || null;
  const dailyDetails = data?.dailyDetails || [];
  const projectSummaries = data?.projectSummaries || [];
  const activitySummaries = data?.activitySummaries || [];

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

  const filteredComparisons = dailyDetails.filter((comp) => {
    if (filter === 'pending') return comp.hasPendingSync;
    if (filter === 'divergent') return comp.hasDivergence;
    if (filter === 'match') return !comp.hasDivergence;
    return true;
  });

  const selectedComparison = useMemo(() => {
    return filteredComparisons.find((item) => item.date === selectedDate) || filteredComparisons[0] || null;
  }, [filteredComparisons, selectedDate]);

  const topProjects = useMemo(() => {
    return projectSummaries.slice(0, 8).map((summary) => ({
      ...summary,
      factorialHours: (summary.byDay || []).reduce((sum, item) => sum + Number(item.factorialHours || 0), 0)
    }));
  }, [projectSummaries]);

  const visibleActivities = useMemo(() => activitySummaries.slice(0, 10), [activitySummaries]);

  const getStatusPresentation = (comparison) => {
    if (comparison.status === 'pending_sync') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }

    if (comparison.hasDivergence) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }

    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  };

  const getStatusLabel = (comparison) => {
    if (comparison.status === 'pending_sync') {
      return 'Pendente';
    }

    return comparison.hasDivergence ? 'Divergência' : 'OK';
  };

  const formatHours = (hours) => {
    return Number(hours || 0).toFixed(2) + 'h';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="ui-empty-state max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="ui-muted">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-shell">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Comparação de Horas</h1>
        <p className="ui-muted">
          Comparação entre o Factorial, o sistema local e os apontamentos encontrados no Artia para o intervalo selecionado.
        </p>
      </div>

      <div className="ui-toolbar">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="ui-label mb-1 block">Data inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="ui-label mb-1 block">Data final</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="ui-input w-full"
              />
            </div>
            <div>
              <label className="ui-label mb-1 block">Projeto</label>
              <select
                value={projectFilter}
                onChange={(event) => {
                  setProjectFilter(event.target.value);
                  setActivityFilter('ALL');
                }}
                className="ui-input w-full"
              >
                <option value="ALL">Todos os projetos</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.number}>{project.number} - {project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ui-label mb-1 block">Atividade</label>
              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value)}
                className="ui-input w-full"
              >
                <option value="ALL">Todas as atividades</option>
                {availableActivities.map((activity) => (
                  <option key={`${activity.projectId}-${activity.id}`} value={activity.label}>{activity.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isError && (
        <div className="ui-banner-danger text-sm">
          {error?.message || 'Erro ao carregar comparação do período.'}
        </div>
      )}

      {stats && (
        <div className={`text-sm ${stats.artiaSourceAvailable ? 'ui-banner-success' : 'ui-banner-warning'}`}>
          {stats.artiaSourceAvailable
            ? `Leitura do Artia ativa via MySQL${stats.artiaSourceTable ? ` · fonte ${stats.artiaSourceTable}` : ''}`
            : 'Leitura do Artia indisponível no momento. Os dados remotos não puderam ser confirmados automaticamente.'}
        </div>
      )}

      {stats && (
        <div className="ui-kpi-grid xl:grid-cols-8">
          <div className="ui-kpi-card">
            <p className="ui-kpi-label">Total de Dias</p>
            <p className="ui-kpi-value">{stats.totalDays}</p>
          </div>
          <div className="ui-kpi-card ui-kpi-card-warning">
            <p className="ui-kpi-label">Pendências de Sync</p>
            <p className="ui-kpi-value text-amber-700 dark:text-amber-100">{stats.daysPendingSync}</p>
          </div>
          <div className="ui-kpi-card ui-kpi-card-accent">
            <p className="ui-kpi-label">Horas Factorial</p>
            <p className="ui-kpi-value">{formatHours(stats.totalFactorialHours)}</p>
          </div>
          <div className="ui-kpi-card">
            <p className="ui-kpi-label">Horas Sistema</p>
            <p className="ui-kpi-value">{formatHours(stats.totalSystemHours)}</p>
          </div>
          <div className="ui-kpi-card">
            <p className="ui-kpi-label">Horas Artia</p>
            <p className="ui-kpi-value">{formatHours(stats.totalArtiaHours)}</p>
          </div>
          <div className="ui-kpi-card">
            <p className="ui-kpi-label">Horas Pendentes</p>
            <p className="ui-kpi-value text-sky-600 dark:text-sky-300">{formatHours(stats.totalPendingSystemHours)}</p>
          </div>
          <div className="ui-kpi-card ui-kpi-card-violet">
            <p className="ui-kpi-label">Só Artia</p>
            <p className="ui-kpi-value text-violet-700 dark:text-violet-100">{stats.remoteOnlyArtiaEntries || 0}</p>
          </div>
          <div className="ui-kpi-card">
            <p className="ui-kpi-label">Projetos</p>
            <p className="ui-kpi-value">{stats.projectCount || 0}</p>
          </div>
        </div>
      )}

      <div className="ui-surface p-4">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            Todos ({dailyDetails.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'primary' : 'secondary'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pendentes ({dailyDetails.filter(c => c.hasPendingSync).length})
          </Button>
          <Button
            variant={filter === 'divergent' ? 'primary' : 'secondary'}
            onClick={() => setFilter('divergent')}
            size="sm"
          >
            Divergências ({dailyDetails.filter(c => c.hasDivergence).length})
          </Button>
          <Button
            variant={filter === 'match' ? 'primary' : 'secondary'}
            onClick={() => setFilter('match')}
            size="sm"
          >
            Corretos ({dailyDetails.filter(c => !c.hasDivergence).length})
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="ui-table-shell">
          <div className="ui-table-scroll">
            <table className="w-full text-slate-700 dark:text-slate-200">
              <thead className="ui-table-head">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Factorial</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Sistema</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Artia</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Sistema</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Artia</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Só Artia</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredComparisons.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  filteredComparisons.map((comp) => (
                    <tr 
                      key={comp.date}
                      onClick={() => setSelectedDate(comp.date)}
                      className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                        comp.date === selectedComparison?.date ? 'bg-primary/10' : comp.hasDivergence ? 'bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm">{formatDate(comp.date)}</td>
                      <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comp.factorialHours)}</td>
                      <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comp.systemHours)}</td>
                      <td className="px-4 py-3 text-sm text-right ui-mono">{formatHours(comp.artiaHours)}</td>
                      <td className="px-4 py-3 text-sm text-center">{comp.systemEvents?.length || 0}</td>
                      <td className="px-4 py-3 text-sm text-center">{comp.artiaEntries?.length || 0}</td>
                      <td className="px-4 py-3 text-sm text-center text-violet-500 dark:text-violet-300">{comp.remoteOnlyArtiaEntries?.length || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusPresentation(comp)}`}>
                          {getStatusLabel(comp)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="ui-surface p-4">
            <h2 className="ui-title mb-3">Detalhe do dia</h2>
            {selectedComparison ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#111827]">
                  <div className="font-semibold">{formatDate(selectedComparison.date)}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>Factorial <span className="ui-mono">{formatHours(selectedComparison.factorialHours)}</span></div>
                    <div>Sistema <span className="ui-mono">{formatHours(selectedComparison.systemHours)}</span></div>
                    <div>Artia <span className="ui-mono">{formatHours(selectedComparison.artiaHours)}</span></div>
                    <div>Pendente <span className="ui-mono">{formatHours(selectedComparison.pendingSystemHours)}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Eventos do sistema</h3>
                  <div className="space-y-2">
                    {(selectedComparison.systemEvents || []).length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">Nenhum evento local no dia.</div>
                    ) : (
                      selectedComparison.systemEvents.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-[#111827]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{event.projectLabel || event.project}</div>
                            <span className="ui-mono">{event.start ? new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'} - {event.end ? new Date(event.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                          </div>
                          <div className="mt-1 text-slate-500 dark:text-slate-400">{event.activityLabel}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="ui-chip px-2 py-0.5">{event.artiaSyncLabel}</span>
                            {event.artiaRemoteEntryId ? <span className="ui-chip ui-chip-success px-2 py-0.5">Artia {event.artiaRemoteEntryId}</span> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Lançamentos do Artia</h3>
                  <div className="space-y-2">
                    {(selectedComparison.artiaEntries || []).length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">Nenhum lançamento remoto no dia.</div>
                    ) : (
                      selectedComparison.artiaEntries.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-[#111827]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{entry.projectLabel || entry.project}</div>
                            <span className="ui-mono">{entry.start ? new Date(entry.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'} - {entry.end ? new Date(entry.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                          </div>
                          <div className="mt-1 text-slate-500 dark:text-slate-400">{entry.activity || 'Atividade Artia'}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="ui-chip px-2 py-0.5">{formatHours(entry.hours)}</span>
                            {selectedComparison.remoteOnlyArtiaEntries?.some((item) => item.id === entry.id) ? <span className="ui-chip ui-chip-violet px-2 py-0.5">Somente Artia</span> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">Selecione um dia para ver o detalhamento.</div>
            )}
          </div>

          <div className="ui-surface p-4">
            <h2 className="ui-title mb-3">Resumo por projeto</h2>
            <div className="space-y-2">
              {topProjects.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">Nenhum projeto no período.</div>
              ) : topProjects.map((summary) => (
                <div key={summary.projectKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-[#111827]">
                  <div className="font-medium">{summary.projectLabel || summary.projectNumber || summary.projectName}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="ui-chip px-2 py-0.5">Factorial {formatHours(summary.factorialHours)}</span>
                    <span className="ui-chip px-2 py-0.5">Sistema {formatHours(summary.systemHours)}</span>
                    <span className="ui-chip ui-chip-success px-2 py-0.5">Artia {formatHours(summary.artiaHours)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ui-surface p-4">
            <h2 className="ui-title mb-3">Resumo por atividade</h2>
            <div className="space-y-2">
              {visibleActivities.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">Nenhuma atividade no período.</div>
              ) : visibleActivities.map((summary) => (
                <div key={summary.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-[#111827]">
                  <div className="font-medium">{summary.activityLabel}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{summary.projectLabel || summary.projectNumber || summary.projectName}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="ui-chip px-2 py-0.5">Sistema {formatHours(summary.systemHours)}</span>
                    <span className="ui-chip ui-chip-success px-2 py-0.5">Artia {formatHours(summary.artiaHours)}</span>
                    {summary.remoteOnlyArtiaHours > 0 ? <span className="ui-chip ui-chip-violet px-2 py-0.5">Só Artia {formatHours(summary.remoteOnlyArtiaHours)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
