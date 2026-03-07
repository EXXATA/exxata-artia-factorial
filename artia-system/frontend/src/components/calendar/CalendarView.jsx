import { useEffect, useMemo, useRef, useState } from 'react';
import { useEvents, useMoveEvent } from '../../hooks/useEvents';
import { useProjects } from '../../hooks/useProjects';
import EventModal from './EventModal';
import { getWeekDays, isToday, startOfWeekMonday, formatDateISO } from '../../utils/dateUtils';
import { combineDayAndTime, extractTimeValue, formatWeekRangeLabel, formatWorkedTime, getDefaultDraftFromSlot, getDraftFromRange, getEventMinutesByDay, getEventPosition, getRangePosition, gridOffsetToMinutes, minutesToTime, snapMinutes, CALENDAR_DEFAULT_EVENT_DURATION, CALENDAR_END_HOUR, CALENDAR_GRID_END_MINUTES, CALENDAR_GRID_START_MINUTES, CALENDAR_MIN_EVENT_MINUTES, CALENDAR_SNAP_MINUTES, CALENDAR_START_HOUR, ROW_HEIGHT, SLOT_MINUTES } from '../../utils/eventViewUtils';
import { getArtiaSyncPresentation, getEventSyncBreakdownByDay } from '../../utils/artiaSyncUtils';

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function CalendarView() {
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [draftEvent, setDraftEvent] = useState(null);
  const [selection, setSelection] = useState(null);
  const [interaction, setInteraction] = useState(null);
  const dayColumnRefs = useRef({});

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const startDate = formatDateISO(weekDays[0]);
  const endDate = formatDateISO(weekDays[6]);

  const { data: eventsData, isLoading } = useEvents({ startDate, endDate });
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const moveMutation = useMoveEvent();

  const events = eventsData?.data || [];
  const projects = projectsData?.data || [];
  const minutesByDay = useMemo(() => getEventMinutesByDay(events), [events]);
  const syncBreakdownByDay = useMemo(() => getEventSyncBreakdownByDay(events), [events]);
  const slotCount = ((CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) / SLOT_MINUTES;
  const slots = useMemo(() => Array.from({ length: slotCount }, (_, index) => index), [slotCount]);

  const getColumnElement = (dayIso) => dayColumnRefs.current[dayIso] || null;

  const getMinutesFromPointer = (dayIso, clientY, strategy = 'round') => {
    const column = getColumnElement(dayIso);

    if (!column) {
      return CALENDAR_GRID_START_MINUTES;
    }

    const rect = column.getBoundingClientRect();
    const offsetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return snapMinutes(gridOffsetToMinutes(offsetY), CALENDAR_SNAP_MINUTES, strategy);
  };

  const resolveDayIsoFromPoint = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    const column = element?.closest?.('[data-day-column="true"]');
    return column?.dataset?.dayIso || null;
  };

  const getEventBounds = (event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);

    return {
      startMinutes: start.getHours() * 60 + start.getMinutes(),
      endMinutes: end.getHours() * 60 + end.getMinutes()
    };
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setDraftEvent(null);
  };

  const finishSelection = (activeSelection) => {
    if (!activeSelection) return;

    const minutesSelected = Math.abs(activeSelection.currentMinutes - activeSelection.startMinutes);
    const nextDraft = minutesSelected < CALENDAR_SNAP_MINUTES
      ? getDefaultDraftFromSlot(activeSelection.dayIso, activeSelection.startMinutes, CALENDAR_DEFAULT_EVENT_DURATION)
      : getDraftFromRange(activeSelection.dayIso, activeSelection.startMinutes, activeSelection.currentMinutes, CALENDAR_MIN_EVENT_MINUTES);

    setSelectedEvent(null);
    setDraftEvent(nextDraft);
    setSelection(null);
  };

  const finishInteraction = async (activeInteraction) => {
    if (!activeInteraction) return;

    setInteraction(null);

    if (!activeInteraction.moved) {
      if (activeInteraction.type === 'move') {
        setDraftEvent(null);
        setSelectedEvent(activeInteraction.event);
      }

      return;
    }

    const moveData = {
      newStart: combineDayAndTime(activeInteraction.dayIso, minutesToTime(activeInteraction.startMinutes)),
      newEnd: combineDayAndTime(activeInteraction.dayIso, minutesToTime(activeInteraction.endMinutes)),
      newDay: activeInteraction.dayIso
    };

    await moveMutation.mutateAsync({
      id: activeInteraction.eventId,
      moveData
    });
  };

  useEffect(() => {
    if (!selection && !interaction) return undefined;

    const handleMouseMove = (event) => {
      if (selection) {
        setSelection((current) => {
          if (!current) return current;

          const currentMinutes = getMinutesFromPointer(current.dayIso, event.clientY, 'round');
          return {
            ...current,
            currentMinutes,
            moved: current.moved || Math.abs(currentMinutes - current.startMinutes) >= CALENDAR_SNAP_MINUTES
          };
        });
      }

      if (interaction) {
        setInteraction((current) => {
          if (!current) return current;

          if (current.type === 'move') {
            const hoveredDayIso = resolveDayIsoFromPoint(event.clientX, event.clientY) || current.dayIso;
            const pointerMinutes = getMinutesFromPointer(hoveredDayIso, event.clientY, 'round');
            const duration = current.endMinutes - current.startMinutes;
            const nextStart = Math.max(
              CALENDAR_GRID_START_MINUTES,
              Math.min(CALENDAR_GRID_END_MINUTES - duration, snapMinutes(pointerMinutes - current.pointerOffsetMinutes, CALENDAR_SNAP_MINUTES, 'round'))
            );
            const nextEnd = Math.min(CALENDAR_GRID_END_MINUTES, nextStart + duration);

            return {
              ...current,
              dayIso: hoveredDayIso,
              startMinutes: nextStart,
              endMinutes: nextEnd,
              moved: current.moved || hoveredDayIso !== current.originalDayIso || nextStart !== current.originalStartMinutes
            };
          }

          if (current.type === 'resize-start') {
            const pointerMinutes = getMinutesFromPointer(current.dayIso, event.clientY, 'round');
            const nextStart = Math.max(
              CALENDAR_GRID_START_MINUTES,
              Math.min(current.endMinutes - CALENDAR_MIN_EVENT_MINUTES, pointerMinutes)
            );

            return {
              ...current,
              startMinutes: nextStart,
              moved: current.moved || nextStart !== current.originalStartMinutes
            };
          }

          const pointerMinutes = getMinutesFromPointer(current.dayIso, event.clientY, 'round');
          const nextEnd = Math.min(
            CALENDAR_GRID_END_MINUTES,
            Math.max(current.startMinutes + CALENDAR_MIN_EVENT_MINUTES, pointerMinutes)
          );

          return {
            ...current,
            endMinutes: nextEnd,
            moved: current.moved || nextEnd !== current.originalEndMinutes
          };
        });
      }
    };

    const handleMouseUp = () => {
      if (selection) {
        finishSelection(selection);
        return;
      }

      if (interaction) {
        void finishInteraction(interaction);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, moveMutation, selection]);

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

  const handleGridMouseDown = (dayIso, event) => {
    if (event.button !== 0) return;
    if (event.target.closest('[data-event-block="true"]') || event.target.closest('[data-resize-handle="true"]')) return;

    const startMinutes = getMinutesFromPointer(dayIso, event.clientY, 'floor');

    event.preventDefault();
    setSelectedEvent(null);
    setDraftEvent(null);
    setSelection({
      dayIso,
      startMinutes,
      currentMinutes: startMinutes,
      moved: false
    });
  };

  const handleEventMouseDown = (calendarEvent, event) => {
    if (event.button !== 0) return;
    if (event.target.closest('[data-resize-handle="true"]')) return;

    event.preventDefault();
    event.stopPropagation();

    const { startMinutes, endMinutes } = getEventBounds(calendarEvent);
    const pointerMinutes = getMinutesFromPointer(calendarEvent.day, event.clientY, 'round');

    setSelectedEvent(null);
    setDraftEvent(null);
    setInteraction({
      type: 'move',
      eventId: calendarEvent.id,
      event: calendarEvent,
      dayIso: calendarEvent.day,
      originalDayIso: calendarEvent.day,
      startMinutes,
      endMinutes,
      originalStartMinutes: startMinutes,
      originalEndMinutes: endMinutes,
      pointerOffsetMinutes: pointerMinutes - startMinutes,
      moved: false
    });
  };

  const handleResizeMouseDown = (calendarEvent, edge, event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const { startMinutes, endMinutes } = getEventBounds(calendarEvent);

    setSelectedEvent(null);
    setDraftEvent(null);
    setInteraction({
      type: edge === 'start' ? 'resize-start' : 'resize-end',
      eventId: calendarEvent.id,
      event: calendarEvent,
      dayIso: calendarEvent.day,
      originalDayIso: calendarEvent.day,
      startMinutes,
      endMinutes,
      originalStartMinutes: startMinutes,
      originalEndMinutes: endMinutes,
      moved: false
    });
  };

  const renderSelectionPreview = (dayIso) => {
    if (!selection || selection.dayIso !== dayIso) return null;

    const previewEnd = selection.moved
      ? selection.currentMinutes
      : selection.startMinutes + CALENDAR_DEFAULT_EVENT_DURATION;
    const position = getRangePosition(selection.startMinutes, previewEnd);

    return (
      <div
        className="pointer-events-none absolute left-1.5 right-1.5 rounded-2xl border border-sky-300/60 bg-sky-400/15 shadow-[0_10px_24px_rgba(56,189,248,0.18)]"
        style={{ top: position.top + 2, height: position.height }}
      />
    );
  };

  const renderInteractionPreview = (dayIso) => {
    if (!interaction || interaction.dayIso !== dayIso) return null;

    const position = getRangePosition(interaction.startMinutes, interaction.endMinutes);

    return (
      <div
        className="pointer-events-none absolute left-1.5 right-1.5 rounded-2xl border border-amber-300/70 bg-amber-400/15 shadow-[0_10px_28px_rgba(251,191,36,0.18)]"
        style={{ top: position.top + 2, height: position.height }}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-[#091321] px-6 py-5 text-slate-200 shadow-lg">
          Carregando calendário...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,25,38,0.96),rgba(7,12,20,0.98))] px-4 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
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

        <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${projectsLoading ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${projectsLoading ? 'bg-amber-300' : 'bg-emerald-300'}`} />
          <span>{projectsLoading ? 'Base Artia MySQL carregando' : `Base Artia MySQL · ${projects.length} projetos`}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-slate-400">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Arraste na grade para criar</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Arraste o bloco para mover</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Arraste as bordas para redimensionar</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Sincronizado</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Marcado manualmente</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Pendente</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.98),rgba(5,9,15,1))] shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
        <div className="h-full overflow-auto scrollbar-thin">
          <div className="min-w-[1120px]">
            <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-white/10 bg-[#0f1724]">
              <div className="border-r border-white/10 px-3 py-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                Horários
              </div>
              {weekDays.map((day, index) => {
                const dayIso = formatDateISO(day);
                const dayMinutes = minutesByDay[dayIso] || 0;
                const syncBreakdown = syncBreakdownByDay[dayIso] || {
                  totalMinutes: 0,
                  syncedMinutes: 0,
                  pendingMinutes: 0,
                  manualMinutes: 0
                };

                return (
                  <div key={dayIso} className={`border-r border-white/10 px-3 py-3 ${isToday(day) ? 'bg-primary/10' : ''}`}>
                    <div className="text-xs text-slate-500">{DAY_NAMES[index]}</div>
                    <div className="mt-1 text-lg font-semibold text-white">{day.toLocaleDateString('pt-BR')}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isToday(day) && <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-light">Hoje</span>}
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100">
                        Tempo Trabalhado: <span className="font-semibold text-emerald-200">{formatWorkedTime(dayMinutes)}</span>
                      </span>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100">
                        Artia: <span className="font-semibold text-emerald-200">{formatWorkedTime(syncBreakdown.syncedMinutes)}</span>
                      </span>
                      {syncBreakdown.pendingMinutes > 0 && (
                        <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-100">
                          Pendente: <span className="font-semibold text-sky-200">{formatWorkedTime(syncBreakdown.pendingMinutes)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex">
              <div className="w-[88px] shrink-0 border-r border-white/10 bg-[#0d141f]">
                {slots.map((slotIndex) => {
                  const minutes = CALENDAR_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
                  const hourLabel = minutes % 60 === 0 ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00` : '';

                  return (
                    <div key={slotIndex} className="border-b border-white/5 px-3 py-1 text-xs text-slate-500" style={{ height: ROW_HEIGHT }}>
                      {hourLabel}
                    </div>
                  );
                })}
              </div>

              <div className="grid flex-1 grid-cols-7">
                {weekDays.map((day) => {
                  const dayIso = formatDateISO(day);
                  const dayEvents = events
                    .filter((event) => event.day === dayIso)
                    .sort((a, b) => new Date(a.start) - new Date(b.start));

                  return (
                    <div
                      key={dayIso}
                      ref={(node) => {
                        if (node) {
                          dayColumnRefs.current[dayIso] = node;
                        }
                      }}
                      data-day-column="true"
                      data-day-iso={dayIso}
                      onMouseDown={(event) => handleGridMouseDown(dayIso, event)}
                      className={`relative border-r border-white/10 ${isToday(day) ? 'bg-primary/5' : 'bg-transparent'} ${selection?.dayIso === dayIso ? 'cursor-row-resize' : interaction?.dayIso === dayIso ? 'cursor-grabbing' : 'cursor-cell'}`}
                      style={{ height: slotCount * ROW_HEIGHT }}
                    >
                      {slots.map((slotIndex) => (
                        <div
                          key={`${dayIso}-${slotIndex}`}
                          className="pointer-events-none absolute left-0 right-0 border-b border-white/5 transition"
                          style={{ top: slotIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                        />
                      ))}

                      {renderSelectionPreview(dayIso)}
                      {renderInteractionPreview(dayIso)}

                      {dayEvents.map((event) => {
                        if (interaction?.eventId === event.id) {
                          return null;
                        }

                        const position = getEventPosition(event);
                        const syncPresentation = getArtiaSyncPresentation(event.artiaSyncStatus);

                        return (
                          <div
                            key={event.id}
                            role="button"
                            tabIndex={0}
                            data-event-block="true"
                            onMouseDown={(mouseEvent) => handleEventMouseDown(event, mouseEvent)}
                            onKeyDown={(keyboardEvent) => {
                              if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                                keyboardEvent.preventDefault();
                                setDraftEvent(null);
                                setSelectedEvent(event);
                              }
                            }}
                            className={`absolute left-1.5 right-1.5 overflow-hidden rounded-2xl border px-2 py-2 text-left shadow-[0_12px_24px_rgba(0,0,0,0.25)] transition hover:shadow-[0_16px_28px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-primary/60 ${syncPresentation.blockClassName}`}
                            style={{ top: position.top + 2, height: position.height }}
                          >
                            <span
                              data-resize-handle="true"
                              onMouseDown={(mouseEvent) => handleResizeMouseDown(event, 'start', mouseEvent)}
                              className="absolute inset-x-3 top-1 h-2 rounded-full bg-white/20 opacity-70 transition hover:bg-white/35"
                            />
                            <div className="inline-flex rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                              {extractTimeValue(event.start)} – {extractTimeValue(event.end)}
                            </div>
                            <div className="mt-2 truncate text-sm font-semibold text-white">{event.project}</div>
                            <div className="truncate text-xs text-slate-300">{event.activityLabel}</div>
                            <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${syncPresentation.badgeClassName}`}>
                              {syncPresentation.label}
                            </div>
                            <span
                              data-resize-handle="true"
                              onMouseDown={(mouseEvent) => handleResizeMouseDown(event, 'end', mouseEvent)}
                              className="absolute inset-x-3 bottom-1 h-2 rounded-full bg-white/20 opacity-70 transition hover:bg-white/35"
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EventModal isOpen={Boolean(selectedEvent || draftEvent)} onClose={closeModal} event={selectedEvent} draft={draftEvent} />
    </div>
  );
}
