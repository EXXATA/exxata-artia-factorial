import { useMemo, useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useProjects } from '../../hooks/useProjects';
import { getWeekDays, startOfWeekMonday, formatDateISO } from '../../utils/dateUtils';
import { formatWeekRangeLabel, formatWorkedTime } from '../../utils/eventViewUtils';
import { buildProjectWeeklySyncSummary } from '../../utils/artiaSyncUtils';

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function GanttView() {
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(new Date()));
  const [projectFilter, setProjectFilter] = useState('ALL');

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekDayIsos = useMemo(() => weekDays.map((day) => formatDateISO(day)), [weekDays]);
  const startDate = weekDayIsos[0];
  const endDate = weekDayIsos[6];

  const { data: eventsData, isLoading } = useEvents({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined
  });
  const { data: projectsData } = useProjects();

  const events = eventsData?.data || [];
  const projects = projectsData?.data || [];
  const rows = useMemo(() => buildProjectWeeklySyncSummary(events, weekDayIsos), [events, weekDayIsos]);

  const handlePrevWeek = () => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    setWeekStart(startOfWeekMonday(new Date()));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-[#091321] px-6 py-5 text-slate-200 shadow-lg">
          Carregando visão Gantt...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-5">
      <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,20,31,0.98),rgba(7,12,18,1))] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handlePrevWeek} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              Sem. anterior
            </button>
            <button onClick={handleToday} className="rounded-xl border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary-light transition hover:bg-primary/20">
              Hoje
            </button>
            <button onClick={handleNextWeek} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              Prox. semana
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111a27] px-5 py-2.5 text-sm font-semibold tracking-wide text-slate-100">
            {formatWeekRangeLabel(weekStart)}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Projeto:</label>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="min-w-[240px] rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary">
              <option value="ALL">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.number}>{project.number} - {project.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
         <span>Mostra o total de horas por projeto e por dia na semana atual.</span>
         <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Sincronizado</span>
         <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Manual</span>
         <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Pendente</span>
       </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.98),rgba(5,9,15,1))] shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
        <div className="h-full overflow-auto scrollbar-thin">
          <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-sm text-slate-200">
            <thead className="sticky top-0 z-10 bg-[#0f1724] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="sticky left-0 z-20 bg-[#0f1724] px-4 py-4">Projeto</th>
                <th className="px-4 py-4">Total Horas na Semana</th>
                {weekDays.map((day, index) => (
                  <th key={index} className="px-4 py-4">
                    <div className="font-semibold text-slate-300">{DAY_NAMES[index]}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{day.toLocaleDateString('pt-BR')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    Nenhuma hora consolidada para a semana atual.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.project} className="transition hover:bg-white/5">
                    <td className="sticky left-0 z-10 border-b border-white/6 bg-[linear-gradient(180deg,rgba(14,23,34,0.98),rgba(12,19,30,0.98))] px-4 py-4 font-semibold text-white">
                      {row.project}
                    </td>
                    <td className="border-b border-white/6 px-4 py-4">
                      <div className="font-mono text-primary-light">{formatWorkedTime(row.totalMinutes)}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-100">Artia {formatWorkedTime(row.syncedMinutes)}</span>
                        {row.manualMinutes > 0 && (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-amber-100">Manual {formatWorkedTime(row.manualMinutes)}</span>
                        )}
                        {row.pendingMinutes > 0 && (
                          <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-sky-100">Pendente {formatWorkedTime(row.pendingMinutes)}</span>
                        )}
                      </div>
                    </td>
                    {weekDayIsos.map((dayIso) => {
                      const daySummary = row.byDay[dayIso] || {
                        totalMinutes: 0,
                        syncedMinutes: 0,
                        pendingMinutes: 0,
                        manualMinutes: 0
                      };
                      const minutes = daySummary.totalMinutes;
                      const width = row.totalMinutes ? Math.max((minutes / row.totalMinutes) * 100, minutes > 0 ? 10 : 0) : 0;
                      const syncedWidth = minutes ? (daySummary.syncedMinutes / minutes) * 100 : 0;
                      const manualWidth = minutes ? (daySummary.manualMinutes / minutes) * 100 : 0;
                      const pendingOnlyMinutes = Math.max(0, daySummary.pendingMinutes - daySummary.manualMinutes);
                      const pendingWidth = minutes ? (pendingOnlyMinutes / minutes) * 100 : 0;

                      return (
                        <td key={dayIso} className="border-b border-white/6 px-4 py-4">
                          <div className="rounded-2xl border border-white/8 bg-[#0b1624] p-2">
                            <div className="h-2 overflow-hidden rounded-full bg-white/5">
                              <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${width}%` }}>
                                <div className="h-full bg-emerald-400" style={{ width: `${syncedWidth}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${manualWidth}%` }} />
                                <div className="h-full bg-sky-400" style={{ width: `${pendingWidth}%` }} />
                              </div>
                            </div>
                            <div className={`mt-2 text-xs font-semibold ${minutes > 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                              {formatWorkedTime(minutes)}
                            </div>
                            {minutes > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400">
                                {daySummary.syncedMinutes > 0 && <span>A {formatWorkedTime(daySummary.syncedMinutes)}</span>}
                                {daySummary.manualMinutes > 0 && <span>M {formatWorkedTime(daySummary.manualMinutes)}</span>}
                                {pendingOnlyMinutes > 0 && <span>P {formatWorkedTime(pendingOnlyMinutes)}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
