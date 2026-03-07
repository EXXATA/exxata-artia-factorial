import { useMemo, useState } from 'react';
import EventModal from '../calendar/EventModal';
import { useEvents } from '../../hooks/useEvents';
import { useProjects } from '../../hooks/useProjects';
import { formatDateBR, formatDateISO, startOfWeekMonday, addDays } from '../../utils/dateUtils';
import { extractTimeValue, formatWorkedTime, getEventMinutesByDay } from '../../utils/eventViewUtils';
import { getArtiaSyncPresentation } from '../../utils/artiaSyncUtils';
import { calculateDuration } from '../../utils/timeUtils';

export default function TableView() {
  const initialWeekStart = startOfWeekMonday(new Date());
  const [startDate, setStartDate] = useState(formatDateISO(initialWeekStart));
  const [endDate, setEndDate] = useState(formatDateISO(addDays(initialWeekStart, 6)));
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [draftEvent, setDraftEvent] = useState(null);

  const { data: eventsData, isLoading } = useEvents({
    startDate,
    endDate,
    project: projectFilter !== 'ALL' ? projectFilter : undefined
  });
  const { data: projectsData } = useProjects();

  const events = eventsData?.data || [];
  const projects = projectsData?.data || [];

  const availableActivities = useMemo(() => {
    if (projectFilter !== 'ALL') {
      const project = projects.find((item) => String(item.number) === String(projectFilter));
      return project?.activities || [];
    }

    return projects.flatMap((project) => project.activities || []);
  }, [projectFilter, projects]);

  const filteredEvents = useMemo(() => {
    const normalizedActivityFilter = activityFilter.trim().toLowerCase();

    return [...events]
      .filter((event) => {
        if (activityFilter === 'ALL') return true;
        return event.activityLabel?.trim().toLowerCase() === normalizedActivityFilter;
      })
      .sort((a, b) => {
        const byDay = a.day.localeCompare(b.day);
        if (byDay !== 0) return byDay;
        return new Date(a.start) - new Date(b.start);
      });
  }, [activityFilter, events]);

  const minutesByDay = useMemo(() => getEventMinutesByDay(filteredEvents), [filteredEvents]);

  const handleNewEvent = () => {
    const todayIso = formatDateISO(new Date());
    const day = todayIso >= startDate && todayIso <= endDate ? todayIso : startDate;

    setSelectedEvent(null);
    setDraftEvent({ day, startTime: '08:00', endTime: '08:50' });
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setDraftEvent(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-[#091321] px-6 py-5 text-slate-200 shadow-lg">
          Carregando tabela...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-5">
      <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,20,31,0.98),rgba(7,12,18,1))] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <label className="text-slate-400">De:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary" />
            <label className="text-slate-400">Até:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary" />
            <label className="ml-2 text-slate-400">Projeto:</label>
            <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setActivityFilter('ALL'); }} className="min-w-[220px] rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary">
              <option value="ALL">Todos os projetos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.number}>{project.number} - {project.name}</option>
              ))}
            </select>
            <label className="text-slate-400">Atividade:</label>
            <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="min-w-[220px] rounded-xl border border-white/10 bg-[#0b1624] px-3 py-2 text-white outline-none focus:border-primary">
              <option value="ALL">Todas as atividades</option>
              {availableActivities.map((activity) => (
                <option key={`${activity.projectId}-${activity.id}`} value={activity.label}>{activity.label}</option>
              ))}
            </select>
          </div>

          <button onClick={handleNewEvent} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark">
            + Novo apontamento
          </button>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.98),rgba(5,9,15,1))] shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
        <div className="h-full overflow-auto scrollbar-thin">
          <table className="min-w-full border-collapse text-sm text-slate-200">
            <thead className="sticky top-0 z-10 bg-[#0f1724] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Projeto</th>
                <th className="px-4 py-3">Hora Início</th>
                <th className="px-4 py-3">Hora de Término</th>
                <th className="px-4 py-3">Esforço</th>
                <th className="px-4 py-3">Esforço Dia</th>
                <th className="px-4 py-3">Atividade</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Status Artia</th>
                <th className="px-4 py-3">Registro Artia</th>
                <th className="px-4 py-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-10 text-center text-slate-400">
                    Nenhum apontamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const effort = calculateDuration(event.start, event.end);
                  const syncPresentation = getArtiaSyncPresentation(event.artiaSyncStatus);

                  return (
                    <tr
                      key={event.id}
                      onClick={() => {
                        setDraftEvent(null);
                        setSelectedEvent(event);
                      }}
                      className="cursor-pointer border-b border-white/6 transition hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-medium text-white">{formatDateBR(event.day)}</td>
                      <td className="px-4 py-3">{event.project}</td>
                      <td className="px-4 py-3 font-mono">{extractTimeValue(event.start)}</td>
                      <td className="px-4 py-3 font-mono">{extractTimeValue(event.end)}</td>
                      <td className="px-4 py-3 font-mono text-primary-light">{formatWorkedTime(effort)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-200">{formatWorkedTime(minutesByDay[event.day] || 0)}</td>
                      <td className="px-4 py-3">{event.activityLabel}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-slate-400">{event.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${syncPresentation.badgeClassName}`}>
                          {syncPresentation.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {event.artiaRemoteEntryId ? (
                          <div className="space-y-1">
                            <div className="font-mono text-emerald-100">{event.artiaRemoteEntryId}</div>
                            {event.artiaRemoteHours > 0 && <div>{event.artiaRemoteHours.toFixed(2)}h</div>}
                          </div>
                        ) : (
                          <span className="text-slate-500">{event.artiaSourceAvailable ? 'Não encontrado' : 'Leitura indisponível'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{event.activityId || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="text-sm text-slate-400">Dica: clique em uma linha para editar o evento.</div>

      <EventModal isOpen={Boolean(selectedEvent || draftEvent)} onClose={closeModal} event={selectedEvent} draft={draftEvent} />
    </div>
  );
}
