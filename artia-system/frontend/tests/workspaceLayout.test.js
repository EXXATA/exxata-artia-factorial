import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkspaceViewByPath } from '../src/components/layout/workspaceNavigation.js';
import {
  buildCalendarDayHeaderMetrics,
  getCalendarViewportHeight,
  getDefaultCalendarScrollTop
} from '../src/components/calendar/calendarViewport.js';

test('getWorkspaceViewByPath resolves the current workspace tab metadata', () => {
  assert.deepEqual(
    getWorkspaceViewByPath('/comparison'),
    {
      path: '/comparison',
      label: 'Comparacao',
      shortLabel: 'Comp',
      shortcut: 'Alt+6',
      icon: 'comparison',
      description: 'Resumo agregado'
    }
  );

  assert.deepEqual(
    getWorkspaceViewByPath('/unknown'),
    {
      path: '/',
      label: 'Calendario',
      shortLabel: 'Cal',
      shortcut: 'Alt+1',
      icon: 'calendar',
      description: 'Semana operacional'
    }
  );
});

test('getDefaultCalendarScrollTop anchors the weekly viewport at 08:00 by default', () => {
  assert.equal(
    getDefaultCalendarScrollTop(),
    448
  );

  assert.equal(
    getDefaultCalendarScrollTop({ targetHour: 6 }),
    336
  );

  assert.equal(
    getDefaultCalendarScrollTop({ targetHour: -3 }),
    0
  );
});

test('getCalendarViewportHeight keeps the calendar scroll area inside the viewport', () => {
  assert.equal(
    getCalendarViewportHeight({
      viewportHeight: 980,
      shellTop: 220,
      bottomOffset: 24,
      minHeight: 420
    }),
    736
  );

  assert.equal(
    getCalendarViewportHeight({
      viewportHeight: 560,
      shellTop: 220,
      bottomOffset: 24,
      minHeight: 420
    }),
    420
  );
});

test('buildCalendarDayHeaderMetrics keeps only the compact daily cues needed above the grid', () => {
  assert.deepEqual(
    buildCalendarDayHeaderMetrics({
      dayMinutes: 248,
      syncBreakdown: { pendingMinutes: 248 },
      dayComparison: { factorialHours: 8.45, remoteOnlyArtiaEntries: [] },
      artiaMinutes: 0,
      unpositionedRemoteEntries: []
    }),
    {
      footer: [
        { label: 'Fac', value: '08:27' },
        { label: 'Artia', value: '00:00' }
      ],
      details: [
        { label: 'Trabalho', value: '04:08', tone: 'success' },
        { label: 'Pend', value: '04:08', tone: 'neutral' }
      ]
    }
  );

  assert.deepEqual(
    buildCalendarDayHeaderMetrics({
      dayMinutes: 50,
      syncBreakdown: { pendingMinutes: 50 },
      dayComparison: { factorialHours: 8.1, remoteOnlyArtiaEntries: [{ id: 1 }] },
      artiaMinutes: 540,
      unpositionedRemoteEntries: [{ id: 7 }]
    }),
    {
      footer: [
        { label: 'Fac', value: '08:06' },
        { label: 'Artia', value: '09:00' }
      ],
      details: [
        { label: 'Trabalho', value: '00:50', tone: 'success' },
        { label: 'Pend', value: '00:50', tone: 'neutral' },
        { label: 'So Artia', value: '1', tone: 'violet' },
        { label: 'Sem posicao', value: '1', tone: 'warning' }
      ]
    }
  );
});
