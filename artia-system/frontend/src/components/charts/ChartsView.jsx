import { useMemo, useState } from 'react';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useWorkedHoursComparison } from '../../hooks/useWorkedHoursComparison';
import { useProjects } from '../../hooks/useProjects';
import { useThemeStore } from '../../store/slices/uiSlice';
import WorkedHoursRangePanel from '../integration/WorkedHoursRangePanel';
import { addDays, formatDateISO, startOfWeekMonday } from '../../utils/dateUtils';
import { formatWorkedTime } from '../../utils/eventViewUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = ['#4ea1ff', '#2dd4bf', '#f59e0b', '#f97316', '#a78bfa', '#22c55e', '#ef4444', '#14b8a6'];

function getSourceHours(item, source) {
  if (source === 'system') {
    return Number(item.systemHours || 0);
  }

  if (source === 'artia') {
    return Number(item.artiaHours || 0);
  }

  return Number(item.systemHours || 0) + Number(item.artiaHours || 0);
}

function getSourceLabel(source) {
  if (source === 'system') return 'Sistema';
  if (source === 'artia') return 'Artia';
  return 'Soma';
}

function buildTimelineSeriesFromDetails(details, groupBy, source) {
  const buckets = new Map();

  details.forEach((detail) => {
    const date = new Date(`${detail.date}T00:00:00`);
    const key = groupBy === 'week'
      ? formatDateISO(startOfWeekMonday(date))
      : detail.date.slice(0, 7);
    buckets.set(key, (buckets.get(key) || 0) + getSourceHours(detail, source));
  });

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, hours]) => ({
      label: groupBy === 'week' ? new Date(`${key}T00:00:00`).toLocaleDateString('pt-BR') : `${key.slice(5, 7)}/${key.slice(0, 4)}`,
      hours: Number(hours.toFixed(2))
    }));
}

function buildProjectDistributionFromSummaries(projectSummaries, source) {
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

  const { data: comparisonData, isLoading } = useWorkedHoursComparison({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined,
    enabled: Boolean(startDate && endDate)
  });
  const { data: projectsData } = useProjects();

  const projects = projectsData?.data || [];
  const dailyDetails = comparisonData?.dailyDetails || [];
  const projectSummaries = comparisonData?.projectSummaries || [];

  const timeline = useMemo(
    () => buildTimelineSeriesFromDetails(dailyDetails, groupBy, source),
    [dailyDetails, groupBy, source]
  );
  const projectDistribution = useMemo(
    () => buildProjectDistributionFromSummaries(projectSummaries, source),
    [projectSummaries, source]
  );
  const totalSelectedSourceHours = useMemo(
    () => timeline.reduce((sum, item) => sum + item.hours, 0),
    [timeline]
  );
  const chartLegendColor = theme === 'dark' ? '#cbd5e1' : '#64748b';
  const chartGridColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.18)';
  const chartBorderColor = theme === 'dark' ? '#0f172a' : '#ffffff';

  const barData = {
    labels: timeline.map((item) => item.label),
    datasets: [
      {
        label: `Horas · ${getSourceLabel(source)}`,
        data: timeline.map((item) => item.hours),
        borderRadius: 10,
        backgroundColor: 'rgba(78,161,255,0.72)',
        borderColor: '#4ea1ff',
        borderWidth: 1
      }
    ]
  };

  const doughnutData = {
    labels: projectDistribution.map((item) => item.label),
    datasets: [
      {
        data: projectDistribution.map((item) => item.hours),
        backgroundColor: projectDistribution.map((_, index) => COLORS[index % COLORS.length]),
        borderColor: chartBorderColor,
        borderWidth: 2
      }
    ]
  };

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartLegendColor
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = Number(context.raw || 0);
            return `${context.label}: ${formatWorkedTime(Math.round(value * 60))}`;
          }
        }
      }
    }
  };

  const barOptions = {
    ...baseOptions,
    scales: {
      x: {
        ticks: { color: chartLegendColor },
        grid: { color: chartGridColor }
      },
      y: {
        ticks: { color: chartLegendColor },
        grid: { color: chartGridColor }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ui-empty-state max-w-md px-6 py-5">
          Carregando gráficos...
        </div>
      </div>
    );
  }

  return (
    <div className="view-shell">
      <section className="ui-toolbar">
        <div className="ui-toolbar-group">
          <label className="ui-label">Período</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ui-input" />
          <span className="ui-muted">→</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="ui-input" />
          <label className="ui-label">Projeto</label>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="ui-input min-w-[220px]">
            <option value="ALL">Todos os projetos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.number}>{project.number} - {project.name}{project.active ? '' : ' · Inativo'}</option>
            ))}
          </select>
          <label className="ui-label">Agrupar por</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="ui-input">
            <option value="month">Meses</option>
            <option value="week">Semanas</option>
          </select>
          <label className="ui-label">Fonte</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="ui-input">
            <option value="system">Sistema</option>
            <option value="artia">Artia</option>
            <option value="combined">Soma</option>
          </select>
          <span className="ui-chip ui-chip-accent">
            {getSourceLabel(source)} {formatWorkedTime(Math.round(totalSelectedSourceHours * 60))}
          </span>
        </div>
      </section>

      <WorkedHoursRangePanel
        startDate={startDate}
        endDate={endDate}
        project={projectFilter !== 'ALL' ? projectFilter : undefined}
        title="Conciliação diária dos gráficos"
        subtitle="Leitura diária do mesmo período usado nas visualizações analíticas"
      />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="ui-surface flex min-h-[360px] flex-col overflow-hidden p-5">
          <h3 className="ui-title">Horas (ao Longo do Tempo) · {getSourceLabel(source)}</h3>
          <div className="mt-5 min-h-0 flex-1">
            {timeline.length === 0 ? (
              <div className="ui-empty-state flex h-full items-center justify-center">Sem dados no período selecionado.</div>
            ) : (
              <Bar data={barData} options={barOptions} />
            )}
          </div>
        </article>

        <article className="ui-surface flex min-h-[360px] flex-col overflow-hidden p-5">
          <h3 className="ui-title">Projetos (Distribuição de Horas) · {getSourceLabel(source)}</h3>
          <div className="mt-5 min-h-0 flex-1">
            {projectDistribution.length === 0 ? (
              <div className="ui-empty-state flex h-full items-center justify-center">Sem dados no período selecionado.</div>
            ) : (
              <Doughnut data={doughnutData} options={baseOptions} />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
