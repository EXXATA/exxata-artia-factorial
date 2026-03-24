import { useEffect, useMemo, useState } from 'react';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useWorkedHoursComparison } from '../../hooks/useWorkedHoursComparison';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';
import { useThemeStore } from '../../store/slices/uiSlice';
import WorkedHoursRangePanel from '../integration/WorkedHoursRangePanel';
import ChartsToolbar from './ChartsToolbar';
import { addDays, formatDateISO, startOfWeekMonday } from '../../utils/dateUtils';
import { formatWorkedTime } from '../../utils/eventViewUtils';
import { formatProjectOptionLabel, normalizeAvailableProjectOptions } from '../../utils/viewFilterOptions';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = ['#4ea1ff', '#2dd4bf', '#f59e0b', '#f97316', '#a78bfa', '#22c55e', '#ef4444', '#14b8a6'];

function getSourceHours(item, source) {
  if (source === 'system') return Number(item.systemHours || 0);
  if (source === 'artia') return Number(item.artiaHours || 0);
  return Number(item.systemHours || 0) + Number(item.artiaHours || 0);
}

function getSourceLabel(source) {
  if (source === 'system') return 'Sistema';
  if (source === 'artia') return 'Artia';
  return 'Soma';
}

function buildTimelineSeries(details, groupBy, source) {
  const buckets = new Map();

  (details || []).forEach((detail) => {
    const date = new Date(`${detail.date}T00:00:00`);
    const key = groupBy === 'week' ? formatDateISO(startOfWeekMonday(date)) : detail.date.slice(0, 7);
    buckets.set(key, (buckets.get(key) || 0) + getSourceHours(detail, source));
  });

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, hours]) => ({
      label: groupBy === 'week' ? new Date(`${key}T00:00:00`).toLocaleDateString('pt-BR') : `${key.slice(5, 7)}/${key.slice(0, 4)}`,
      hours: Number(hours.toFixed(2))
    }));
}

function buildProjectDistribution(projectSummaries, source) {
  return (projectSummaries || [])
    .map((summary) => ({
      label: summary.projectLabel || summary.projectNumber || summary.projectName || 'Sem projeto',
      hours: Number(getSourceHours(summary, source).toFixed(2))
    }))
    .filter((item) => item.hours > 0)
    .sort((left, right) => right.hours - left.hours);
}

export default function ChartsView() {
  const initialWeekStart = startOfWeekMonday(new Date());
  const [startDate, setStartDate] = useState(formatDateISO(initialWeekStart));
  const [endDate, setEndDate] = useState(formatDateISO(addDays(initialWeekStart, 6)));
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [groupBy, setGroupBy] = useState('month');
  const [source, setSource] = useState('combined');
  const { theme } = useThemeStore();

  const comparisonQuery = useWorkedHoursComparison({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    enabled: Boolean(startDate && endDate)
  });
  useRegisterGlobalAction({
    id: `charts:${startDate}:${endDate}:${projectFilter}`,
    label: 'Atualizar gráficos',
    run: comparisonQuery.refresh
  });
  const allProjectsQuery = useWorkedHoursComparison({ startDate, endDate, enabled: Boolean(startDate && endDate) });

  const comparisonData = comparisonQuery.data || null;
  const filterSourceData = allProjectsQuery.data || comparisonData;
  const projectOptions = useMemo(
    () => normalizeAvailableProjectOptions(filterSourceData?.availableProjects || []),
    [filterSourceData]
  );
  const timeline = useMemo(
    () => buildTimelineSeries(comparisonData?.dailyDetails || [], groupBy, source),
    [comparisonData, groupBy, source]
  );
  const projectDistribution = useMemo(
    () => buildProjectDistribution(comparisonData?.projectSummaries || [], source),
    [comparisonData, source]
  );
  const totalSelectedSourceHours = useMemo(
    () => timeline.reduce((sum, item) => sum + item.hours, 0),
    [timeline]
  );

  useEffect(() => {
    if (projectFilter !== 'ALL' && !projectOptions.some((project) => String(project.number) === String(projectFilter))) {
      setProjectFilter('ALL');
    }
  }, [projectFilter, projectOptions]);

  if (comparisonQuery.isLoading && !comparisonData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ui-empty-state max-w-md px-6 py-5">
          Carregando graficos...
        </div>
      </div>
    );
  }

  const chartLegendColor = theme === 'dark' ? '#cbd5e1' : '#64748b';
  const chartGridColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.18)';
  const chartBorderColor = theme === 'dark' ? '#0f172a' : '#ffffff';
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartLegendColor } },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${formatWorkedTime(Math.round(Number(context.raw || 0) * 60))}`
        }
      }
    }
  };

  return (
    <div className="view-shell">
      <ChartsToolbar
        startDate={startDate}
        endDate={endDate}
        projectFilter={projectFilter}
        projectOptions={projectOptions}
        projectOptionLabel={formatProjectOptionLabel}
        groupBy={groupBy}
        source={source}
        totalLabel={`${getSourceLabel(source)} ${formatWorkedTime(Math.round(totalSelectedSourceHours * 60))}`}
        onStartDateChange={(event) => setStartDate(event.target.value)}
        onEndDateChange={(event) => setEndDate(event.target.value)}
        onProjectChange={(event) => setProjectFilter(event.target.value)}
        onGroupByChange={(event) => setGroupBy(event.target.value)}
        onSourceChange={(event) => setSource(event.target.value)}
      />

      <WorkedHoursRangePanel
        startDate={startDate}
        endDate={endDate}
        stats={comparisonData?.stats || null}
        isLoading={comparisonQuery.isLoading && !comparisonData}
        isError={comparisonQuery.isError}
        error={comparisonQuery.error}
        isFetching={comparisonQuery.isFetching}
        onRefresh={comparisonQuery.refresh}
        title="Conciliacao diaria dos graficos"
        subtitle="Leitura diaria do mesmo periodo usado nas visualizacoes analiticas"
      />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="ui-surface flex min-h-[360px] flex-col overflow-hidden p-5">
          <h3 className="ui-title">Horas ao Longo do Tempo · {getSourceLabel(source)}</h3>
          <div className="mt-5 min-h-0 flex-1">
            {timeline.length === 0 ? (
              <div className="ui-empty-state flex h-full items-center justify-center">Sem dados no periodo selecionado.</div>
            ) : (
              <Bar
                data={{
                  labels: timeline.map((item) => item.label),
                  datasets: [{
                    label: `Horas · ${getSourceLabel(source)}`,
                    data: timeline.map((item) => item.hours),
                    borderRadius: 10,
                    backgroundColor: 'rgba(78,161,255,0.72)',
                    borderColor: '#4ea1ff',
                    borderWidth: 1
                  }]
                }}
                options={{
                  ...baseOptions,
                  scales: {
                    x: { ticks: { color: chartLegendColor }, grid: { color: chartGridColor } },
                    y: { ticks: { color: chartLegendColor }, grid: { color: chartGridColor } }
                  }
                }}
              />
            )}
          </div>
        </article>

        <article className="ui-surface flex min-h-[360px] flex-col overflow-hidden p-5">
          <h3 className="ui-title">Projetos · {getSourceLabel(source)}</h3>
          <div className="mt-5 min-h-0 flex-1">
            {projectDistribution.length === 0 ? (
              <div className="ui-empty-state flex h-full items-center justify-center">Sem dados no periodo selecionado.</div>
            ) : (
              <Doughnut
                data={{
                  labels: projectDistribution.map((item) => item.label),
                  datasets: [{
                    data: projectDistribution.map((item) => item.hours),
                    backgroundColor: projectDistribution.map((_, index) => COLORS[index % COLORS.length]),
                    borderColor: chartBorderColor,
                    borderWidth: 2
                  }]
                }}
                options={baseOptions}
              />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
