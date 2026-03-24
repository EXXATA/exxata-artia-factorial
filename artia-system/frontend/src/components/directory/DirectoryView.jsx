import { useEffect, useMemo, useState } from 'react';
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
  
  const projectsQuery = useProjects();
  const { data: projectsData, isLoading } = projectsQuery;
  const comparisonQuery = useWorkedHoursComparison({
    startDate,
    endDate,
    enabled: Boolean(startDate && endDate)
  });
  const { data: comparisonData } = comparisonQuery;
  useRegisterGlobalAction({
    id: `directory:${startDate}:${endDate}`,
    label: 'Atualizar diretório e catálogo',
    run: async () => {
      await Promise.all([
        projectsQuery.refetch(),
        comparisonQuery.refresh()
      ]);
    }
  });
  const projects = projectsData?.data || [];
  const projectSummaries = comparisonData?.projectSummaries || [];
  const activitySummaries = comparisonData?.activitySummaries || [];

  const projectSummariesByKey = useMemo(() => {
    return projectSummaries.reduce((accumulator, summary) => {
      if (summary.projectId) {
        accumulator[`id:${summary.projectId}`] = summary;
      }
      if (summary.projectNumber) {
        accumulator[`number:${summary.projectNumber}`] = summary;
      }
      accumulator[`key:${summary.projectKey}`] = summary;
      return accumulator;
    }, {});
  }, [projectSummaries]);

  const filteredProjects = projects.filter(project => {
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

    return projectSummariesByKey[`id:${selectedProject.id}`]
      || projectSummariesByKey[`number:${selectedProject.number}`]
      || null;
  }, [projectSummariesByKey, selectedProject]);

  const selectedProjectFactorialHours = useMemo(() => {
    return (selectedProjectSummary?.byDay || []).reduce((sum, item) => sum + Number(item.factorialHours || 0), 0);
  }, [selectedProjectSummary]);

  const selectedProjectActivities = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    const summaryByActivityKey = (activitySummaries || []).reduce((accumulator, item) => {
      if (
        String(item.projectId || '') === String(selectedProject.id || '')
        || String(item.projectNumber || '') === String(selectedProject.number || '')
      ) {
        accumulator[String(item.activityId || item.activityLabel || item.key)] = item;
      }

      return accumulator;
    }, {});

    const catalogActivities = (selectedProject.activities || []).map((activity) => {
      const summary = summaryByActivityKey[String(activity.artiaId || activity.id || activity.label)]
        || summaryByActivityKey[String(activity.id || activity.label)]
        || summaryByActivityKey[String(activity.label)]
        || null;

      return {
        id: activity.id,
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
        String(item.projectId || '') === String(selectedProject.id || '')
        || String(item.projectNumber || '') === String(selectedProject.number || '')
      ))
      .filter((item) => !catalogLabels.has(String(item.activityLabel || '').trim().toLowerCase()))
      .map((item) => ({
        id: item.activityId || item.key,
        label: item.activityLabel,
        artiaId: item.activityId,
        active: true,
        systemHours: item.systemHours || 0,
        artiaHours: item.artiaHours || 0,
        remoteOnlyArtiaHours: item.remoteOnlyArtiaHours || 0,
        systemEventCount: item.systemEventCount || 0,
        artiaEntryCount: item.artiaEntryCount || 0
      }));

    return [...catalogActivities, ...extraActivities].sort((left, right) => (right.artiaHours + right.systemHours) - (left.artiaHours + left.systemHours));
  }, [activitySummaries, selectedProject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="ui-empty-state max-w-md px-6 py-5">Carregando projetos...</div>
      </div>
    );
  }

  return (
    <div className="view-shell">
      <div className="ui-toolbar">
        <div className="ui-toolbar-row">
          <div className="ui-toolbar-group">
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ui-input w-full max-w-md"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="ui-input"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="ui-input"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="ui-chip">Projetos no catálogo: {projects.length}</span>
          <span className="ui-chip ui-chip-accent">Projetos com horas: {projectSummaries.length}</span>
        </div>
      </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="ui-surface w-1/3 p-4 overflow-y-auto">
          <h3 className="ui-label mb-3 block">
            Projetos ({filteredProjects.length})
          </h3>
          <div className="space-y-2">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`rounded-2xl border p-3 cursor-pointer transition-colors ${
                  selectedProject?.id === project.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-[#111827] dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900 dark:text-white">{project.number}</div>
                  {project.active === false && (
                    <span className="ui-chip ui-chip-warning px-2 py-0.5 text-[10px]">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {project.name}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="ui-chip px-2 py-0.5">
                    Sistema {formatHours(projectSummariesByKey[`id:${project.id}`]?.systemHours || projectSummariesByKey[`number:${project.number}`]?.systemHours || 0)}
                  </span>
                  <span className="ui-chip ui-chip-success px-2 py-0.5">
                    Artia {formatHours(projectSummariesByKey[`id:${project.id}`]?.artiaHours || projectSummariesByKey[`number:${project.number}`]?.artiaHours || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ui-surface flex-1 p-4 overflow-y-auto">
          {selectedProject ? (
            <>
              <h3 className="ui-label mb-3 block">
                Atividades ({selectedProject.activities?.length || 0})
              </h3>
              <div className={`mb-3 rounded-2xl border px-3 py-2 text-sm ${selectedProject.active === false ? 'ui-banner-warning' : 'ui-banner-success'}`}>
                {selectedProject.active === false ? 'Projeto inativo no catálogo sincronizado do Artia.' : 'Projeto ativo no catálogo sincronizado do Artia.'}
              </div>
              <div className="mb-4 grid gap-3 md:grid-cols-4">
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
                  <div className="ui-kpi-label">Somente Artia</div>
                  <div className="ui-kpi-value">{formatHours(selectedProjectSummary?.remoteOnlyArtiaHours || 0)}</div>
                </div>
              </div>
              <div className="space-y-2">
                {selectedProjectActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#111827]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900 dark:text-white">{activity.label}</div>
                      {activity.active === false && (
                        <span className="ui-chip ui-chip-warning px-2 py-0.5 text-[10px]">
                          Inativa
                        </span>
                      )}
                    </div>
                    {activity.artiaId && (
                      <div className="text-sm text-primary mt-1">
                        ID: {activity.artiaId}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="ui-chip px-2 py-0.5">
                        Sistema {formatHours(activity.systemHours)} · {activity.systemEventCount} evento(s)
                      </span>
                      <span className="ui-chip ui-chip-success px-2 py-0.5">
                        Artia {formatHours(activity.artiaHours)} · {activity.artiaEntryCount} lançamento(s)
                      </span>
                      {activity.remoteOnlyArtiaHours > 0 ? (
                        <span className="ui-chip ui-chip-violet px-2 py-0.5">
                          Só Artia {formatHours(activity.remoteOnlyArtiaHours)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="ui-empty-state flex h-full items-center justify-center">
              Selecione um projeto para ver as atividades
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
