import { useEffect, useMemo, useState } from 'react';
import WorkspacePage from '../layout/WorkspacePage';
import { useWorkedHoursComparison } from '../../hooks/useWorkedHoursComparison';
import { useProjects } from '../../hooks/useProjects';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';

function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0]
  };
}

function formatHours(hours) {
  return `${Number(hours || 0).toFixed(2)}h`;
}

export default function DirectoryView() {
  const defaultRange = getDefaultRange();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [selectedProject, setSelectedProject] = useState(null);
  const hasSelectedProject = Boolean(selectedProject?.number);

  const projectsQuery = useProjects();
  const { data: projectsData, isLoading } = projectsQuery;
  const comparisonQuery = useWorkedHoursComparison({
    startDate,
    endDate,
    projectKey: hasSelectedProject ? selectedProject.key : undefined,
    enabled: Boolean(hasSelectedProject && startDate && endDate)
  });
  const { data: comparisonData } = comparisonQuery;

  useRegisterGlobalAction({
    id: `directory:${startDate}:${endDate}:${selectedProject?.number || 'catalog'}`,
    label: 'Atualizar diretorio e catalogo',
    run: async () => {
      await projectsQuery.refetch();

      if (hasSelectedProject) {
        await comparisonQuery.refresh();
      }
    }
  });

  const projects = projectsData?.data || [];
  const projectSummaries = comparisonData?.projectSummaries || [];
  const activitySummaries = comparisonData?.activitySummaries || [];

  const filteredProjects = projects.filter((project) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      String(project.number || '').toLowerCase().includes(search) ||
      String(project.name || '').toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    const nextSelectedProject = projects.find((project) => String(project.id) === String(selectedProject.id)) || null;
    if (!nextSelectedProject) {
      setSelectedProject(null);
    }
  }, [projects, selectedProject]);

  const selectedProjectSummary = useMemo(() => {
    if (!selectedProject) {
      return null;
    }

    return projectSummaries.find((summary) => (
      String(summary.projectKey || '') === String(selectedProject.key || '') ||
      String(summary.projectId || '') === String(selectedProject.id || '') ||
      String(summary.projectNumber || '') === String(selectedProject.number || '')
    )) || null;
  }, [projectSummaries, selectedProject]);

  const selectedProjectFactorialHours = useMemo(
    () => (selectedProjectSummary?.byDay || []).reduce((sum, item) => sum + Number(item.factorialHours || 0), 0),
    [selectedProjectSummary]
  );

  const selectedProjectActivities = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    const summaryByActivityKey = (activitySummaries || []).reduce((accumulator, item) => {
      if (
        String(item.projectKey || '') === String(selectedProject.key || '') ||
        String(item.projectId || '') === String(selectedProject.id || '') ||
        String(item.projectNumber || '') === String(selectedProject.number || '')
      ) {
        accumulator[String(item.key || item.activityId || item.activityLabel)] = item;
      }

      return accumulator;
    }, {});

    const catalogActivities = (selectedProject.activities || []).map((activity) => {
      const activityKey = String(activity.key || activity.artiaId || activity.id || activity.label);
      const summary = summaryByActivityKey[activityKey] ||
        summaryByActivityKey[String(activity.artiaId || activity.id || activity.label)] ||
        summaryByActivityKey[String(activity.label)] ||
        null;

      return {
        id: activity.id,
        key: activityKey,
        label: activity.label,
        artiaId: activity.artiaId,
        active: activity.active,
        systemHours: summary?.systemHours || 0,
        artiaHours: summary?.artiaHours || 0,
        remoteOnlyArtiaHours: summary?.remoteOnlyArtiaHours || 0,
        systemEventCount: summary?.systemEventCount || 0,
        artiaEntryCount: summary?.artiaEntryCount || 0
      };
    });

    const catalogLabels = new Set(catalogActivities.map((activity) => String(activity.label).trim().toLowerCase()));
    const extraActivities = (activitySummaries || [])
      .filter((item) => (
        String(item.projectKey || '') === String(selectedProject.key || '') ||
        String(item.projectId || '') === String(selectedProject.id || '') ||
        String(item.projectNumber || '') === String(selectedProject.number || '')
      ))
      .filter((item) => !catalogLabels.has(String(item.activityLabel || '').trim().toLowerCase()))
      .map((item) => ({
        id: item.activityId || item.key,
        key: item.key,
        label: item.activityLabel,
        artiaId: item.activityId,
        active: true,
        systemHours: item.systemHours || 0,
        artiaHours: item.artiaHours || 0,
        remoteOnlyArtiaHours: item.remoteOnlyArtiaHours || 0,
        systemEventCount: item.systemEventCount || 0,
        artiaEntryCount: item.artiaEntryCount || 0
      }));

    return [...catalogActivities, ...extraActivities].sort(
      (left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours)
    );
  }, [activitySummaries, selectedProject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="ui-empty-state max-w-md px-6 py-5">Carregando projetos...</div>
      </div>
    );
  }

  const toolbar = (
    <section className="ui-toolbar">
      <div className="ui-toolbar-row">
        <div className="ui-toolbar-group">
          <div className="ui-toolbar-field ui-toolbar-field-search">
            <label className="ui-label">Projeto</label>
            <input
              type="search"
              placeholder="Buscar por nome ou codigo"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="ui-input w-full"
            />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">De</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="ui-input w-full" />
          </div>

          <div className="ui-toolbar-field ui-toolbar-field-sm">
            <label className="ui-label">Ate</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="ui-input w-full" />
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <WorkspacePage toolbar={toolbar}>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)]">
        <section className="ui-surface min-h-0 overflow-hidden p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="ui-title">Projetos</h3>
            <span className="ui-chip">{filteredProjects.length}</span>
          </div>

          <div className="mt-4 h-[calc(100%-48px)] overflow-y-auto pr-1">
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProject(project)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    selectedProject?.id === project.id
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-[#111827] dark:hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900 dark:text-white">{project.number}</div>
                    {project.active === false ? (
                      <span className="ui-chip ui-chip-warning px-2 py-0.5 text-[10px]">
                        Inativo
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {project.name}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="ui-chip px-2 py-0.5">
                      {project.activities?.length || 0} atividade(s)
                    </span>
                    {selectedProject?.id === project.id && comparisonQuery.isFetching ? (
                      <span className="ui-chip ui-chip-accent px-2 py-0.5">
                        Atualizando resumo
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="ui-surface min-h-0 overflow-hidden p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="ui-title">Atividades</h3>
            {selectedProject ? <span className="ui-chip ui-chip-accent">{selectedProject.number}</span> : null}
          </div>

          {selectedProject ? (
            <div className="mt-4 flex h-[calc(100%-48px)] flex-col gap-4 overflow-hidden">
              {comparisonQuery.isLoading && !comparisonData ? (
                <div className="ui-empty-state mb-4">
                  Carregando resumo do projeto...
                </div>
              ) : null}

              {comparisonQuery.isError ? (
                <div className="ui-banner-danger mb-4 text-sm">
                  {comparisonQuery.error?.message || 'Erro ao carregar o resumo do projeto selecionado.'}
                </div>
              ) : null}

              <div className="space-y-4">
                <div className={`${selectedProject.active === false ? 'ui-banner-warning' : 'ui-banner-success'} text-sm`}>
                  {selectedProject.active === false
                    ? 'Projeto inativo no catalogo sincronizado do Artia.'
                    : 'Projeto ativo no catalogo sincronizado do Artia.'}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="ui-kpi-card ui-kpi-card-accent">
                    <div className="ui-kpi-label">Factorial</div>
                    <div className="ui-kpi-value">{formatHours(selectedProjectFactorialHours)}</div>
                  </div>
                  <div className="ui-kpi-card">
                    <div className="ui-kpi-label">Sistema</div>
                    <div className="ui-kpi-value">{formatHours(selectedProjectSummary?.systemHours || 0)}</div>
                  </div>
                  <div className="ui-kpi-card">
                    <div className="ui-kpi-label">Artia</div>
                    <div className="ui-kpi-value">{formatHours(selectedProjectSummary?.artiaHours || 0)}</div>
                  </div>
                  <div className="ui-kpi-card ui-kpi-card-violet">
                    <div className="ui-kpi-label">So Artia</div>
                    <div className="ui-kpi-value">{formatHours(selectedProjectSummary?.remoteOnlyArtiaHours || 0)}</div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto pr-1">
                <div className="space-y-2">
                  {selectedProjectActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#111827]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-900 dark:text-white">{activity.label}</div>
                        {activity.active === false ? (
                          <span className="ui-chip ui-chip-warning px-2 py-0.5 text-[10px]">
                            Inativa
                          </span>
                        ) : null}
                      </div>

                      {activity.artiaId ? (
                        <div className="mt-1 text-sm text-primary">
                          ID: {activity.artiaId}
                        </div>
                      ) : null}

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="ui-chip px-2 py-0.5">
                          Sistema {formatHours(activity.systemHours)} - {activity.systemEventCount} evento(s)
                        </span>
                        <span className="ui-chip ui-chip-success px-2 py-0.5">
                          Artia {formatHours(activity.artiaHours)} - {activity.artiaEntryCount} lancamento(s)
                        </span>
                        {activity.remoteOnlyArtiaHours > 0 ? (
                          <span className="ui-chip ui-chip-violet px-2 py-0.5">
                            So Artia {formatHours(activity.remoteOnlyArtiaHours)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="ui-empty-state flex h-full items-center justify-center">
              Selecione um projeto para ver as atividades.
            </div>
          )}
        </section>
      </div>
    </WorkspacePage>
  );
}
