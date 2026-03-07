import { useMemo, useState } from 'react';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useEvents } from '../../hooks/useEvents';
import { useProjects } from '../../hooks/useProjects';
import { addDays, formatDateISO, startOfWeekMonday } from '../../utils/dateUtils';
import { buildProjectDistribution, buildTimelineSeries, formatWorkedTime } from '../../utils/eventViewUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = ['#4ea1ff', '#2dd4bf', '#f59e0b', '#f97316', '#a78bfa', '#22c55e', '#ef4444', '#14b8a6'];

export default function ChartsView() {
  const initialWeekStart = startOfWeekMonday(new Date());
  const [startDate, setStartDate] = useState(formatDateISO(initialWeekStart));
  const [endDate, setEndDate] = useState(formatDateISO(addDays(initialWeekStart, 6)));
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [groupBy, setGroupBy] = useState('month');

  const { data: eventsData, isLoading } = useEvents({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined
  });
  const { data: projectsData } = useProjects();

  const events = eventsData?.data || [];
  const projects = projectsData?.data || [];

  const timeline = useMemo(() => buildTimelineSeries(events, groupBy), [events, groupBy]);
  const projectDistribution = useMemo(() => buildProjectDistribution(events), [events]);

  const barData = {
    labels: timeline.map((item) => item.label),
    datasets: [
      {
        label: 'Horas',
        data: timeline.map((item) => Number((item.minutes / 60).toFixed(2))),
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
        data: projectDistribution.map((item) => item.minutes),
        backgroundColor: projectDistribution.map((_, index) => COLORS[index % COLORS.length]),
        borderColor: '#08111d',
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
          color: '#d6dfeb'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const minutes = typeof value === 'number' && value < 1000 ? Math.round(value * 60) : value;
            return `${context.label}: ${formatWorkedTime(minutes)}`;
          }
        }
      }
    }
  };

  const barOptions = {
    ...baseOptions,
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255,255,255,0.06)' }
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255,255,255,0.08)' }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-[#091321] px-6 py-5 text-slate-200 shadow-lg">
          Carregando gráficos...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-5">
      <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,20,31,0.98),rgba(7,12,18,1))] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <label className="text-slate-400">Período:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary" />
          <span>→</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary" />
          <label className="ml-2 text-slate-400">Projeto:</label>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="min-w-[220px] rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary">
            <option value="ALL">Todos os projetos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.number}>{project.number} - {project.name}</option>
            ))}
          </select>
          <label className="text-slate-400">Agrupar por:</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary">
            <option value="month">Meses</option>
            <option value="week">Semanas</option>
          </select>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="flex min-h-[360px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.98),rgba(5,9,15,1))] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
          <h3 className="text-lg font-semibold text-white">Horas (ao Longo do Tempo)</h3>
          <div className="mt-5 min-h-0 flex-1">
            {timeline.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400">Sem dados no período selecionado.</div>
            ) : (
              <Bar data={barData} options={barOptions} />
            )}
          </div>
        </article>

        <article className="flex min-h-[360px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.98),rgba(5,9,15,1))] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
          <h3 className="text-lg font-semibold text-white">Projetos (Distribuição de Horas)</h3>
          <div className="mt-5 min-h-0 flex-1">
            {projectDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400">Sem dados no período selecionado.</div>
            ) : (
              <Doughnut data={doughnutData} options={baseOptions} />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
