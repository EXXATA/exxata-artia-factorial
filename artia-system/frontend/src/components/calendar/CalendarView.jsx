import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import WorkspacePage from '../layout/WorkspacePage';
import { useMoveEvent } from '../../hooks/useEvents';
import { useRegisterGlobalAction } from '../../hooks/useRegisterGlobalAction';
import { prefetchWeekViewData, useWeekViewData } from '../../hooks/useWeekViewData';
import { addDays, getWeekDays, isToday, startOfWeekMonday, formatDateISO } from '../../utils/dateUtils';
import {
  buildCalendarDayHeaderMetrics,
  DAY_HEADER_COLLAPSED_HEIGHT,
  getCalendarViewportHeight,
  getDefaultCalendarScrollTop,
  TIME_COLUMN_WIDTH
} from './calendarViewport.js';
import {
  buildCalendarDayBuckets,
  combineDayAndTime,
  extractTimeValue,
  CALENDAR_DEFAULT_EVENT_DURATION,
  CALENDAR_END_HOUR,
  CALENDAR_GRID_END_MINUTES,
  CALENDAR_GRID_START_MINUTES,
  CALENDAR_MIN_EVENT_MINUTES,
  CALENDAR_SNAP_MINUTES,
  CALENDAR_START_HOUR,
  ROW_HEIGHT,
  SLOT_MINUTES,
  getDefaultDraftFromSlot,
  getDraftFromRange,
  getEventMinuteRange,
  getEventMinutesByDay,
  getEventPosition,
  getRangePosition,
  gridOffsetToMinutes,
  minutesToTime,
  snapMinutes
} from '../../utils/eventViewUtils';
import { getArtiaSyncPresentation, getEventSyncBreakdownByDay } from '../../utils/artiaSyncUtils';

const DAY_NAMES = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

const EMPTY_SYNC_BREAKDOWN = {
  totalMinutes: 0,
  syncedMinutes: 0,
  pendingMinutes: 0,
  manualMinutes: 0
};

const EventModal = lazy(() => import('./EventModal'));
const ArtiaRemoteEntriesModal = lazy(() => import('./ArtiaRemoteEntriesModal'));

function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div className="ui-surface relative z-10 px-6 py-5">
        Carregando detalhes...
      </div>
    </div>
  );
}

export default function CalendarView() {
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [draftEvent, setDraftEvent] = useState(null);
  const [selection, setSelection] = useState(null);
  const [interaction, setInteraction] = useState(null);
  const [expandedDayIso, setExpandedDayIso] = useState(null);
  const [boardViewportHeight, setBoardViewportHeight] = useState(420);
  const [scrollAnchorKey, setScrollAnchorKey] = useState(0);
  const [topbarContextHost, setTopbarContextHost] = useState(null);
  const [selectedRemoteEntries, setSelectedRemoteEntries] = useState([]);
  const [remoteModalTitle, setRemoteModalTitle] = useState('Lancamentos do Artia');
  const [remoteModalSubtitle, setRemoteModalSubtitle] = useState('Visualizacao somente leitura dos lancamentos encontrados no Artia via MySQL.');
  const dayColumnRefs = useRef({});
  const boardShellRef = useRef(null);
  const scrollContainerRef = useRef(null);
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
  const moveMutation = useMoveEvent();

  useRegisterGlobalAction({
    id: `calendar:${startDate}:${endDate}`,
    label: 'Atualizar semana visivel',
    run: refresh
  });

  const events = weekViewData?.events || [];
  const comparisonData = weekViewData || null;
  const dailyDetailsByDate = useMemo(
    () => Object.fromEntries((comparisonData?.dailyDetails || []).map((detail) => [detail.date, detail])),
    [comparisonData]
  );
  const minutesByDay = useMemo(() => getEventMinutesByDay(events), [events]);
  const syncBreakdownByDay = useMemo(() => getEventSyncBreakdownByDay(events), [events]);
  const dayBuckets = useMemo(() => buildCalendarDayBuckets({
    weekDays,
    events,
    dailyDetailsByDate,
    minutesByDay,
    syncBreakdownByDay
  }), [dailyDetailsByDate, events, minutesByDay, syncBreakdownByDay, weekDays]);
  const slotCount = ((CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) / SLOT_MINUTES;
  const slots = useMemo(() => Array.from({ length: slotCount }, (_, index) => index), [slotCount]);
  const isEventModalOpen = Boolean(selectedEvent || draftEvent);
  const isRemoteEntriesModalOpen = selectedRemoteEntries.length > 0;

  const getColumnElement = (dayIso) => dayColumnRefs.current[dayIso] || null;

  const prefetchAdjacentWeek = (offsetDays) => {
    if (!userScopeKey || weekDays.length === 0) {
      return;
    }

    void prefetchWeekViewData(queryClient, userScopeKey, {
      startDate: formatDateISO(addDays(weekDays[0], offsetDays)),
      endDate: formatDateISO(addDays(weekDays[6], offsetDays))
    });
  };

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

  useEffect(() => {
    setTopbarContextHost(document.getElementById('workspace-topbar-context'));
  }, []);

  useEffect(() => {
    const updateViewportHeight = () => {
      const shell = boardShellRef.current;

      if (!shell) {
        return;
      }

      const nextHeight = getCalendarViewportHeight({
        viewportHeight: window.innerHeight,
        shellTop: shell.getBoundingClientRect().top,
        bottomOffset: 24,
        minHeight: 420
      });

      setBoardViewportHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    updateViewportHeight();

    const frame = window.requestAnimationFrame(updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    setExpandedDayIso(null);
  }, [startDate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setExpandedDayIso(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return undefined;
    }

    const nextScrollTop = getDefaultCalendarScrollTop({
      calendarStartHour: CALENDAR_START_HOUR,
      rowHeight: ROW_HEIGHT,
      slotMinutes: SLOT_MINUTES
    });

    let settleFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({ top: nextScrollTop, behavior: 'auto' });
      settleFrame = window.requestAnimationFrame(() => {
        container.scrollTo({ top: nextScrollTop, behavior: 'auto' });
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(settleFrame);
    };
  }, [boardViewportHeight, isLoading, scrollAnchorKey, startDate]);

  const handlePrevWeek = () => {
    setScrollAnchorKey((current) => current + 1);
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setScrollAnchorKey((current) => current + 1);
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    setScrollAnchorKey((current) => current + 1);
    setWeekStart(startOfWeekMonday(new Date()));
  };

  const handleGridMouseDown = (dayIso, event) => {
    if (event.button !== 0) return;
    if (event.target.closest('[data-event-block="true"]') || event.target.closest('[data-resize-handle="true"]')) return;

    const startMinutes = getMinutesFromPointer(dayIso, event.clientY, 'floor');

    event.preventDefault();
    setExpandedDayIso(null);
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
    setExpandedDayIso(null);

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
    setExpandedDayIso(null);

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
          Carregando calendario...
        </div>
      </div>
    );
  }

  const topbarCalendarControls = topbarContextHost
    ? createPortal(
      <div className="workspace-topbar-context-scroll">
        <div className="workspace-topbar-context-group">
          <button
            onClick={handlePrevWeek}
            onMouseEnter={() => prefetchAdjacentWeek(-7)}
            onFocus={() => prefetchAdjacentWeek(-7)}
            disabled={isFetching}
            className="workspace-action-button disabled:opacity-50"
          >
            Sem. anterior
          </button>
          <button
            onClick={handleToday}
            disabled={isFetching}
            className="workspace-action-button workspace-action-button-primary disabled:opacity-50"
          >
            Hoje
          </button>
          <button
            onClick={handleNextWeek}
            onMouseEnter={() => prefetchAdjacentWeek(7)}
            onFocus={() => prefetchAdjacentWeek(7)}
            disabled={isFetching}
            className="workspace-action-button disabled:opacity-50"
          >
            Prox. semana
          </button>
        </div>
      </div>
    , topbarContextHost)
    : null;

  return (
    <>
      {topbarCalendarControls}
      <WorkspacePage>
        <div ref={boardShellRef} className="ui-table-shell calendar-board-shell" style={{ height: boardViewportHeight }}>
          <div ref={scrollContainerRef} className="ui-table-scroll calendar-board-scroll">
            <div className="min-w-[1120px]">
              <div
                className="calendar-board-header grid border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#111827]"
                style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(0, 1fr))` }}
              >
                <div className="calendar-board-corner border-r border-slate-200 px-2 py-2.5 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Horarios
                </div>

                {weekDays.map((day, index) => {
                  const dayIso = formatDateISO(day);
                  const dayBucket = dayBuckets[dayIso];
                  const dayMinutes = dayBucket?.dayMinutes || 0;
                  const dayComparison = dayBucket?.dayComparison || null;
                  const syncBreakdown = dayBucket?.syncBreakdown || EMPTY_SYNC_BREAKDOWN;
                  const artiaMinutes = dayBucket?.artiaMinutes || 0;
                  const unpositionedRemoteEntries = dayBucket?.unpositionedRemoteEntries || [];
                  const headerMetrics = buildCalendarDayHeaderMetrics({
                    artiaMinutes,
                    dayComparison,
                    dayMinutes,
                    syncBreakdown,
                    unpositionedRemoteEntries
                  });
                  const isExpanded = expandedDayIso === dayIso;

                  return (
                    <div
                      key={dayIso}
                      data-expanded={isExpanded ? 'true' : 'false'}
                      className={`calendar-day-header border-r border-slate-200 px-3 py-2 dark:border-white/10 ${isToday(day) ? 'bg-primary/5' : ''}`}
                      style={{ minHeight: DAY_HEADER_COLLAPSED_HEIGHT }}
                    >
                      <button
                        type="button"
                        className="calendar-day-toggle"
                        onClick={() => setExpandedDayIso((current) => (current === dayIso ? null : dayIso))}
                        aria-expanded={isExpanded}
                      >
                        <div className="calendar-day-title flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{DAY_NAMES[index]}</div>
                            <div className="mt-0.5 text-[15px] font-semibold text-slate-900 dark:text-white">{day.toLocaleDateString('pt-BR')}</div>
                          </div>
                          {isToday(day) ? <span className="ui-chip ui-chip-accent px-2.5 py-1 text-[10px]">Hoje</span> : null}
                        </div>

                        <div className="calendar-day-footer mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          {headerMetrics.footer.map((item) => (
                            <span key={`${dayIso}-${item.label}`}>
                              {item.label} <strong className="text-slate-900 dark:text-white">{item.value}</strong>
                            </span>
                          ))}
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="calendar-day-detail-popover">
                          {headerMetrics.details.map((item) => {
                            const detailClassName = item.tone === 'warning'
                              ? 'calendar-day-detail-item calendar-day-detail-item-warning'
                              : item.tone === 'violet'
                                ? 'calendar-day-detail-item calendar-day-detail-item-violet'
                                : 'calendar-day-detail-item';

                            if (item.label === 'Sem posicao') {
                              return (
                                <button
                                  type="button"
                                  key={`${dayIso}-${item.label}`}
                                  onClick={() => openRemoteEntriesModal(unpositionedRemoteEntries, {
                                    title: `Lancamentos do Artia sem posicao em ${day.toLocaleDateString('pt-BR')}`,
                                    subtitle: 'Itens sem horario valido para posicionamento na grade. Visualizacao somente leitura.'
                                  })}
                                  className={detailClassName}
                                >
                                  <span>{item.label}</span>
                                  <strong>{item.value}</strong>
                                </button>
                              );
                            }

                            return (
                              <div key={`${dayIso}-${item.label}`} className={detailClassName}>
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="flex">
                <div
                  className="calendar-time-column shrink-0 border-r border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#0c1423]"
                  style={{ width: TIME_COLUMN_WIDTH }}
                >
                  {slots.map((slotIndex) => {
                    const minutes = CALENDAR_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
                    const hourLabel = minutes % 60 === 0 ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00` : '';

                    return (
                      <div key={slotIndex} className="calendar-time-cell border-b border-slate-200 px-2 py-1 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400" style={{ height: ROW_HEIGHT }}>
                        {hourLabel}
                      </div>
                    );
                  })}
                </div>

                <div className="grid flex-1 grid-cols-7">
                  {weekDays.map((day) => {
                    const dayIso = formatDateISO(day);
                    const dayBucket = dayBuckets[dayIso];
                    const dayEvents = dayBucket?.dayEvents || [];
                    const remoteEntryLayouts = dayBucket?.remoteEntryLayouts || [];

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

                        {remoteEntryLayouts.map(({ entry, position }) => (
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
                            title="Lancamento remoto do Artia (nao editavel)"
                          >
                            <div className="inline-flex rounded-full bg-violet-600/10 dark:bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:text-violet-100 shadow-sm border border-violet-500/20">
                              {extractTimeValue(entry.start, entry.day)} - {extractTimeValue(entry.end, entry.day)}
                            </div>
                            <div className="mt-2 truncate text-sm font-semibold text-slate-800 dark:text-white opacity-80">
                              {entry.projectDisplayLabel || entry.projectLabel || entry.project || 'Projeto Artia'}
                            </div>
                            <div className="truncate text-xs text-slate-600 dark:text-slate-300 opacity-80">
                              {entry.activityLabel || entry.activity || 'Atividade Artia'}
                            </div>
                            {entry.endEstimated ? (
                              <div className="mt-1 inline-flex rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-100">
                                Horario estimado
                              </div>
                            ) : null}
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
                              Lancado no Artia
                            </div>
                          </button>
                        ))}

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
                                {extractTimeValue(event.start, event.day)} - {extractTimeValue(event.end, event.day)}
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

      {isEventModalOpen ? (
        <Suspense fallback={<ModalLoadingFallback />}>
          <EventModal isOpen={isEventModalOpen} onClose={closeModal} event={selectedEvent} draft={draftEvent} />
        </Suspense>
      ) : null}

      {isRemoteEntriesModalOpen ? (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ArtiaRemoteEntriesModal
            isOpen={isRemoteEntriesModalOpen}
            onClose={closeRemoteEntriesModal}
            entries={selectedRemoteEntries}
            title={remoteModalTitle}
            subtitle={remoteModalSubtitle}
          />
        </Suspense>
      ) : null}
      </WorkspacePage>
    </>
  );
}
