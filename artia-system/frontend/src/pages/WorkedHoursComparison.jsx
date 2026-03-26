import { useEffect, useMemo, useState } from 'react';
import ComparisonFilters from '../components/comparison/ComparisonFilters';
import ComparisonResultsTable from '../components/comparison/ComparisonResultsTable';
import ComparisonSidePanel from '../components/comparison/ComparisonSidePanel';
import ComparisonSummaryGrid from '../components/comparison/ComparisonSummaryGrid';
import WorkspacePage from '../components/layout/WorkspacePage';
import { useProjects } from '../hooks/useProjects';
import { useWorkedHoursComparison } from '../hooks/useWorkedHoursComparison';
import { useRegisterGlobalAction } from '../hooks/useRegisterGlobalAction';
import { mergeActivityFilterOptions, mergeProjectFilterOptions } from '../utils/viewFilterOptions';
import { getActiveViewFilterValue, reconcileProjectAndActivityFilters } from '../utils/viewFilterState.js';

function getDefaultRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

function filterComparisonsByMode(dailyDetails, filter) {
  if (filter === 'pending') return dailyDetails.filter((comparison) => comparison.hasPendingSync);
  if (filter === 'divergent') return dailyDetails.filter((comparison) => comparison.hasDivergence);
  if (filter === 'match') return dailyDetails.filter((comparison) => !comparison.hasDivergence);
  return dailyDetails;
}

export default function WorkedHoursComparison() {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);

  const comparisonQuery = useWorkedHoursComparison({
    startDate,
    endDate,
    projectKey: getActiveViewFilterValue(projectFilter),
    activityKey: getActiveViewFilterValue(activityFilter)
  });
  const { data: projectsData } = useProjects();

  useRegisterGlobalAction({
    id: `comparison:${startDate}:${endDate}:${projectFilter}:${activityFilter}`,
    label: 'Atualizar comparacao',
    run: comparisonQuery.refresh
  });

  const data = comparisonQuery.data || null;
  const projectCatalog = projectsData?.data || [];
  const projectOptions = useMemo(
    () => mergeProjectFilterOptions({
      catalogProjects: projectCatalog,
      availableProjects: data?.availableProjects || []
    }),
    [data?.availableProjects, projectCatalog]
  );
  const activityOptions = useMemo(
    () => mergeActivityFilterOptions({
      catalogProjects: projectCatalog,
      availableActivities: data?.availableActivities || [],
      selectedProjectKey: projectFilter
    }),
    [data?.availableActivities, projectCatalog, projectFilter]
  );
  const stats = data?.stats || null;
  const dailyDetails = data?.dailyDetails || [];
  const projectSummaries = data?.projectSummaries || [];
  const activitySummaries = data?.activitySummaries || [];

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

  const filteredComparisons = useMemo(
    () => filterComparisonsByMode(dailyDetails, filter),
    [dailyDetails, filter]
  );
  const selectedComparison = useMemo(
    () => filteredComparisons.find((item) => item.date === selectedDate) || filteredComparisons[0] || null,
    [filteredComparisons, selectedDate]
  );
  const topProjects = useMemo(() => projectSummaries.slice(0, 8).map((summary) => ({
    ...summary,
    factorialHours: (summary.byDay || []).reduce((sum, item) => sum + Number(item.factorialHours || 0), 0)
  })), [projectSummaries]);
  const visibleActivities = useMemo(() => activitySummaries.slice(0, 10), [activitySummaries]);

  if (comparisonQuery.isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="ui-empty-state max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="ui-muted">Carregando historico...</p>
        </div>
      </div>
    );
  }

  const toolbar = (
    <ComparisonFilters
      startDate={startDate}
      endDate={endDate}
      projectFilter={projectFilter}
      activityFilter={activityFilter}
      projects={projectOptions}
      availableActivities={activityOptions}
      isFetching={comparisonQuery.isFetching}
      onStartDateChange={(event) => setStartDate(event.target.value)}
      onEndDateChange={(event) => setEndDate(event.target.value)}
      onProjectChange={(event) => {
        setProjectFilter(event.target.value);
        setActivityFilter('ALL');
      }}
      onActivityChange={(event) => setActivityFilter(event.target.value)}
      onRefresh={() => comparisonQuery.refresh()}
    />
  );

  return (
    <WorkspacePage toolbar={toolbar}>
      {comparisonQuery.isError ? (
        <div className="ui-banner-danger text-sm">
          {comparisonQuery.error?.message || 'Erro ao carregar comparacao do periodo.'}
        </div>
      ) : null}

      {stats ? (
        <div className={`text-sm ${stats.artiaSourceAvailable ? 'ui-banner-success' : 'ui-banner-warning'}`}>
          {stats.artiaSourceAvailable
            ? `Leitura do Artia servida do read-side${stats.artiaSourceTable ? ` · origem ${stats.artiaSourceTable}` : ''}`
            : 'Leitura do Artia indisponivel no momento. Os dados remotos nao puderam ser confirmados automaticamente.'}
        </div>
      ) : null}

      <ComparisonSummaryGrid stats={stats} />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="min-h-0 flex flex-col gap-4">
          <ComparisonResultsTable
            filter={filter}
            dailyDetails={dailyDetails}
            filteredComparisons={filteredComparisons}
            selectedDate={selectedComparison?.date || null}
            onFilterChange={setFilter}
            onSelectDate={setSelectedDate}
          />
        </div>

        <ComparisonSidePanel
          selectedComparison={selectedComparison}
          topProjects={topProjects}
          visibleActivities={visibleActivities}
        />
      </div>
    </WorkspacePage>
  );
}
