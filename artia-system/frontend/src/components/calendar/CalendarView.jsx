import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMoveEvent } from '../../hooks/useEvents';
import { useProjects } from '../../hooks/useProjects';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';
import { prefetchWeekViewData, useWeekViewData } from '../../hooks/useWeekViewData';
import EventModal from './EventModal';
import ArtiaRemoteEntriesModal from './ArtiaRemoteEntriesModal';
import WorkedHoursRangePanel from '../integration/WorkedHoursRangePanel';
import { addDays, getWeekDays, isToday, startOfWeekMonday, formatDateISO } from '../../utils/dateUtils';
import { combineDayAndTime, extractTimeValue, formatWeekRangeLabel, formatWorkedTime, getClampedEventPosition, getDefaultDraftFromSlot, getDraftFromRange, getEventMinuteRange, getEventMinutesByDay, getEventPosition, getRangePosition, gridOffsetToMinutes, minutesToTime, snapMinutes, CALENDAR_DEFAULT_EVENT_DURATION, CALENDAR_END_HOUR, CALENDAR_GRID_END_MINUTES, CALENDAR_GRID_START_MINUTES, CALENDAR_MIN_EVENT_MINUTES, CALENDAR_SNAP_MINUTES, CALENDAR_START_HOUR, ROW_HEIGHT, SLOT_MINUTES } from '../../utils/eventViewUtils';
import { getArtiaSyncPresentation, getEventSyncBreakdownByDay } from '../../utils/artiaSyncUtils';

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function formatHoursFromComparison(hours) {
  return formatWorkedTime(Math.round((Number(hours) || 0) * 60));
}

export default function CalendarView() {
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [draftEvent, setDraftEvent] = useState(null);
  const [selection, setSelection] = useState(null);
  const [interaction, setInteraction] = useState(null);
  const [selectedRemoteEntries, setSelectedRemoteEntries] = useState([]);
  const [remoteModalTitle, setRemoteModalTitle] = useState('Lancamentos do Artia');
  const [remoteModalSubtitle, setRemoteModalSubtitle] = useState('Visualizacao somente leitura dos lancamentos encontrados no Artia via MySQL.');
  const dayColumnRefs = useRef({});
  const queryClient = useQueryClient();

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const startDate = formatDateISO(weekDays[0]);
  const endDate = formatDateISO(weekDays[6]);

  const {
    data: weekViewData,
    isLoading,
    isFetching,
    refresh,
    userScopeKey
  } = useWeekViewData({ startDate, endDate, enabled: Boolean(startDate && endDate) });
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const moveMutation = useMoveEvent();

  useRegisterGlobalAction({
    id: `calendar:${startDate}:${endDate}`,
    label: 'Atualizar semana visível',
    run: refresh
  });

  const events = weekViewData?.events || [];
  const projects = projectsData?.data || [];
  const comparisonData = weekViewData || null;
  const dailyDetailsByDate = useMemo(
    () => Object.fromEntries((comparisonData?.dailyDetails || []).map((detail) => [detail.date, detail])),
    [comparisonData]
  );
  const minutesByDay = useMemo(() => getEventMinutesByDay(events), [events]);
  const syncBreakdownByDay = useMemo(() => getEventSyncBreakdownByDay(events), [events]);
  const slotCount = ((CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) / SLOT_MINUTES;
  const slots = useMemo(() => Array.from({ length: slotCount }, (_, index) => index), [slotCount]);

  const getColumnElement = (dayIso) => dayColumnRefs.current[dayIso] || null;

  useEffect(() => {
    if (!userScopeKey || weekDays.length === 0) {
      return;
    }

    void prefetchWeekViewData(queryClient, userScopeKey, {
      startDate: formatDateISO(addDays(weekDays[0], -7)),
      endDate: formatDateISO(addDays(weekDays[6], -7))
    });
    void prefetchWeekViewData(queryClient, userScopeKey, {
      startDate: formatDateISO(addDays(weekDays[0], 7)),
      endDate: formatDateISO(addDays(weekDays[6], 7))
    });
  }, [queryClient, userScopeKey, weekDays]);

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
    const { endMinutes, startMinutes } = getEventMinuteRange(event);
    return { startMinutes, endMinutes };
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setDraftEvent(null);
  };

  const closeRemoteEntriesModal = () => {
    setSelectedRemoteEntries([]);
    setRemoteModalTitle('Lancamentos do Artia');
    setRemoteModalSubtitle('Visualizacao somente leitura dos lancamentos encontrados no Artia via MySQL.');
  };

  const openRemoteEntriesModal = (entries, { title, subtitle } = {}) => {
    setSelectedRemoteEntries(entries || []);
    setRemoteModalTitle(title || 'Lancamentos do Artia');
    setRemoteModalSubtitle(subtitle || 'Visualizacao somente leitura dos lancamentos encontrados no Artia via MySQL.');
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

    if (calendarEvent.hasProjectAccess === false) {
      setDraftEvent(null);
      setSelectedEvent(calendarEvent);
      return;
    }

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
    if (calendarEvent.hasProjectAccess === false) return;

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

  if (isLoading && !weekViewData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ui-empty-state max-w-md px-6 py-5">
          Carregando calendário...
        </div>
      </div>
    );
  }

  return (
    <div className="view-shell">
      <div className="ui-toolbar">
        <div className="ui-toolbar-row">
          <div className="ui-toolbar-group">
          <button onClick={handlePrevWeek} disabled={isFetching} className="app-action-button disabled:opacity-50">
            Sem. anterior
          </button>
          <button onClick={handleToday} disabled={isFetching} className="inline-flex items-center rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-primary-dark hover:bg-primary-dark disabled:opacity-50">
            Hoje
          </button>
          <button onClick={handleNextWeek} disabled={isFetching} className="app-action-button disabled:opacity-50">
            Prox. semana
          </button>
          </div>

          <div className="ui-chip ui-chip-accent text-sm font-semibold">
            {formatWeekRangeLabel(weekStart)}
          </div>

          <div className={`ui-chip ${projectsLoading ? 'ui-chip-warning' : 'ui-chip-success'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${projectsLoading ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <span>{projectsLoading ? 'Base Artia MySQL carregando' : `Base Artia MySQL · ${projects.length} projetos`}</span>
          </div>
          {isFetching ? (
            <div className="ui-chip ui-chip-accent">
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Atualizando semana
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
        <span className="ui-chip">Arraste na grade para criar</span>
        <span className="ui-chip">Arraste o bloco para mover</span>
        <span className="ui-chip">Arraste as bordas para redimensionar</span>
        <span className="ui-chip">Grade completa: 00:00 - 24:00</span>
        <span className="ui-chip">Precisao: 1 minuto</span>
        <span className="ui-chip ui-chip-success"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Sincronizado</span>
        <span className="ui-chip ui-chip-warning"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Marcado manualmente</span>
        <span className="ui-chip"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />Pendente</span>
        <span className="ui-chip ui-chip-violet"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" />Somente Artia</span>
        <span className="ui-chip ui-chip-warning"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Historico sem acesso atual</span>
      </div>

      <WorkedHoursRangePanel
        startDate={startDate}
        endDate={endDate}
        stats={comparisonData?.stats || null}
        isLoading={isLoading && !comparisonData}
        isFetching={isFetching}
        onRefresh={refresh}
        title="Conciliação diária da semana"
        subtitle="Validação dia a dia entre Factorial, sistema e Artia na semana visível"
      />

      <div className="ui-table-shell">
        <div className="ui-table-scroll">
          <div className="min-w-[1120px]">
            <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#111827]">
              <div className="border-r border-slate-200 px-3 py-4 text-xs uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                Horários
              </div>
              {weekDays.map((day, index) => {
                const dayIso = formatDateISO(day);
                const dayMinutes = minutesByDay[dayIso] || 0;
                const dayComparison = dailyDetailsByDate[dayIso] || null;
                const syncBreakdown = syncBreakdownByDay[dayIso] || {
                  totalMinutes: 0,
                  syncedMinutes: 0,
                  pendingMinutes: 0,
                  manualMinutes: 0
                };
                const artiaMinutes = Math.round((dayComparison?.artiaHours || 0) * 60);
                const unpositionedRemoteEntries = (dayComparison?.remoteOnlyArtiaEntries || []).filter((entry) => (
                  !getClampedEventPosition(entry).isVisible
                ));

                return (
                  <div key={dayIso} className={`border-r border-slate-200 px-3 py-3 dark:border-white/10 ${isToday(day) ? 'bg-primary/5' : ''}`}>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{DAY_NAMES[index]}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{day.toLocaleDateString('pt-BR')}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isToday(day) && <span className="ui-chip ui-chip-accent">Hoje</span>}
                      <span className="ui-chip ui-chip-success">
                        Tempo Trabalhado: <span className="font-semibold">{formatWorkedTime(dayMinutes)}</span>
                      </span>
                      <span className="ui-chip">
                        Factorial: <span className="font-semibold text-slate-900 dark:text-white">{formatHoursFromComparison(dayComparison?.factorialHours)}</span>
                      </span>
                      <span className="ui-chip ui-chip-success">
                        Artia: <span className="font-semibold">{formatWorkedTime(artiaMinutes)}</span>
                      </span>
                      {syncBreakdown.pendingMinutes > 0 && (
                        <span className="ui-chip">
                          Pendente: <span className="font-semibold text-slate-900 dark:text-white">{formatWorkedTime(syncBreakdown.pendingMinutes)}</span>
                        </span>
                      )}
                      {dayComparison?.remoteOnlyArtiaEntries?.length ? (
                        <span className="ui-chip ui-chip-violet">
                          Só Artia: <span className="font-semibold">{dayComparison.remoteOnlyArtiaEntries.length}</span>
                        </span>
                      ) : null}
                      {unpositionedRemoteEntries.length ? (
                        <button
                          type="button"
                          onClick={() => openRemoteEntriesModal(unpositionedRemoteEntries, {
                            title: `Lancamentos do Artia sem posicao em ${day.toLocaleDateString('pt-BR')}`,
                            subtitle: 'Itens sem horario valido para posicionamento na grade. Visualizacao somente leitura.'
                          })}
                          className="ui-chip border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                        >
                          Sem posicao: <span className="font-semibold">{unpositionedRemoteEntries.length}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex">
              <div className="w-[88px] shrink-0 border-r border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#0c1423]">
                {slots.map((slotIndex) => {
                  const minutes = CALENDAR_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
                  const hourLabel = minutes % 60 === 0 ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00` : '';

                  return (
                    <div key={slotIndex} className="border-b border-slate-200 px-3 py-1 text-xs text-slate-500 dark:border-white/5 dark:text-slate-400" style={{ height: ROW_HEIGHT }}>
                      {hourLabel}
                    </div>
                  );
                })}
              </div>

              <div className="grid flex-1 grid-cols-7">
                {weekDays.map((day) => {
                  const dayIso = formatDateISO(day);
                  const dayComparison = dailyDetailsByDate[dayIso] || null;
                  const dayEvents = events
                    .filter((event) => event.day === dayIso)
                    .sort((a, b) => new Date(a.start) - new Date(b.start));
                  const remoteOnlyEntries = (dayComparison?.remoteOnlyArtiaEntries || [])
                    .sort((a, b) => new Date(a.start) - new Date(b.start));
                  const remoteEntryLayouts = remoteOnlyEntries
                    .map((entry) => ({
                      entry,
                      position: getClampedEventPosition(entry)
                    }))
                    .filter(({ position }) => position.isVisible);

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
                      className={`relative border-r border-slate-200 bg-white dark:border-white/10 dark:bg-transparent ${isToday(day) ? 'bg-primary/5 dark:bg-primary/5' : ''} ${selection?.dayIso === dayIso ? 'cursor-row-resize' : interaction?.dayIso === dayIso ? 'cursor-grabbing' : 'cursor-cell'}`}
                      style={{ height: slotCount * ROW_HEIGHT }}
                    >
                      {slots.map((slotIndex) => (
                        <div
                          key={`${dayIso}-${slotIndex}`}
                          className="pointer-events-none absolute left-0 right-0 border-b border-slate-100 transition dark:border-white/5"
                          style={{ top: slotIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                        />
                      ))}

                      {renderSelectionPreview(dayIso)}
                      {renderInteractionPreview(dayIso)}

                      {remoteEntryLayouts.map(({ entry, position }) => {
                        return (
                          <button
                            type="button"
                            key={`artia-only-${entry.id}`}
                            onMouseDown={(mouseEvent) => {
                              mouseEvent.preventDefault();
                              mouseEvent.stopPropagation();
                            }}
                            onClick={(mouseEvent) => {
                              mouseEvent.stopPropagation();
                              openRemoteEntriesModal([entry], {
                                title: 'Lancamento do Artia',
                                subtitle: 'Visualizacao somente leitura do lancamento remoto.'
                              });
                            }}
                            className="absolute left-1.5 right-1.5 z-[1] overflow-hidden rounded-2xl border border-violet-300/40 bg-[linear-gradient(180deg,rgba(139,92,246,0.1),rgba(139,92,246,0.25))] dark:bg-[linear-gradient(180deg,rgba(139,92,246,0.15),rgba(49,46,129,0.5))] px-2 py-2 text-left shadow-sm opacity-90"
                            style={{ top: position.top + 2, height: position.height }}
                            title="Lançamento remoto do Artia (não editável)"
                          >
                            <div className="inline-flex rounded-full bg-violet-600/10 dark:bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:text-violet-100 shadow-sm border border-violet-500/20">
                              {extractTimeValue(entry.start, entry.day)} – {extractTimeValue(entry.end, entry.day)}
                            </div>
                            <div className="mt-2 truncate text-sm font-semibold text-slate-800 dark:text-white opacity-80">{entry.projectDisplayLabel || entry.projectLabel || entry.project || 'Projeto Artia'}</div>
                            <div className="truncate text-xs text-slate-600 dark:text-slate-300 opacity-80">{entry.activityLabel || entry.activity || 'Atividade Artia'}</div>
                            {entry.endEstimated ? (
                              <div className="mt-1 inline-flex rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-100">
                                Horario estimado
                              </div>
                            ) : null}
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
                              Lançado no Artia
                            </div>
                          </button>
                        );
                      })}

                      {dayEvents.map((event) => {
                        if (interaction?.eventId === event.id) {
                          return null;
                        }

                        const position = getEventPosition(event);
                        const syncPresentation = getArtiaSyncPresentation(event.artiaSyncStatus);
                        const isLocked = event.hasProjectAccess === false;

                        return (
                          <div
                            key={event.id}
                            role="button"
                            tabIndex={0}
                            aria-disabled={isLocked}
                            data-event-block="true"
                            onMouseDown={(mouseEvent) => handleEventMouseDown(event, mouseEvent)}
                            onKeyDown={(keyboardEvent) => {
                              if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                                keyboardEvent.preventDefault();
                                setDraftEvent(null);
                                setSelectedEvent(event);
                              }
                            }}
                            className={`absolute left-1.5 right-1.5 overflow-hidden rounded-2xl border px-2 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/60 ${isLocked ? 'cursor-not-allowed opacity-85 shadow-sm' : 'shadow-[0_12px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_28px_rgba(0,0,0,0.3)]'} ${syncPresentation.blockClassName}`}
                            style={{ top: position.top + 2, height: position.height }}
                            title={isLocked ? 'Historico sem acesso atual ao projeto no Artia' : undefined}
                          >
                            {!isLocked ? (
                              <span
                                data-resize-handle="true"
                                onMouseDown={(mouseEvent) => handleResizeMouseDown(event, 'start', mouseEvent)}
                                className="absolute inset-x-3 top-1 h-2 rounded-full bg-white/20 opacity-70 transition hover:bg-white/35"
                              />
                            ) : null}
                            <div className="inline-flex rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                              {extractTimeValue(event.start, event.day)} – {extractTimeValue(event.end, event.day)}
                            </div>
                            <div className="mt-2 truncate text-sm font-semibold text-white">{event.project}</div>
                            <div className="truncate text-xs text-slate-300">{event.activityLabel}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <div className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${syncPresentation.badgeClassName}`}>
                                {syncPresentation.label}
                              </div>
                              {isLocked ? (
                                <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-50">
                                  Sem acesso atual
                                </div>
                              ) : null}
                            </div>
                            {!isLocked ? (
                              <span
                                data-resize-handle="true"
                                onMouseDown={(mouseEvent) => handleResizeMouseDown(event, 'end', mouseEvent)}
                                className="absolute inset-x-3 bottom-1 h-2 rounded-full bg-white/20 opacity-70 transition hover:bg-white/35"
                              />
                            ) : null}
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
      <ArtiaRemoteEntriesModal
        isOpen={Boolean(selectedRemoteEntries.length)}
        onClose={closeRemoteEntriesModal}
        entries={selectedRemoteEntries}
        title={remoteModalTitle}
        subtitle={remoteModalSubtitle}
      />
    </div>
  );
}
