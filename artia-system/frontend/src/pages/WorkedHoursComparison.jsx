import { useEffect, useMemo, useState } from 'react';
import { useWorkedHoursComparison } from '../hooks/useWorkedHoursComparison';
import ComparisonFilters from '../components/comparison/ComparisonFilters';
import ComparisonResultsTable from '../components/comparison/ComparisonResultsTable';
import ComparisonSidePanel from '../components/comparison/ComparisonSidePanel';
import ComparisonSummaryGrid from '../components/comparison/ComparisonSummaryGrid';
import { normalizeAvailableActivityOptions, normalizeAvailableProjectOptions } from '../utils/viewFilterOptions';

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
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    activity: activityFilter !== 'ALL' ? activityFilter : undefined
  });
  const allProjectsQuery = useWorkedHoursComparison({ startDate, endDate });

  const data = comparisonQuery.data || null;
  const filterSourceData = allProjectsQuery.data || data;
  const projectOptions = useMemo(
    () => normalizeAvailableProjectOptions(filterSourceData?.availableProjects || []),
    [filterSourceData]
  );
  const activityOptions = useMemo(
    () => normalizeAvailableActivityOptions(filterSourceData?.availableActivities || [], projectOptions, projectFilter),
    [filterSourceData, projectFilter, projectOptions]
  );
  const stats = data?.stats || null;
  const dailyDetails = data?.dailyDetails || [];
  const projectSummaries = data?.projectSummaries || [];
  const activitySummaries = data?.activitySummaries || [];

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

  return (
    <div className="view-shell">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Comparacao de Horas</h1>
        <p className="ui-muted">
          A leitura longa usa o read-side agregado por usuario. O detalhamento completo fica nas visoes semanais.
        </p>
      </div>

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

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
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
    </div>
  );
}
