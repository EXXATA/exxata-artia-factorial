import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInlineDraftRow,
  buildInlineDraft,
  buildInlineEventPayload,
  canEditTableRow,
  getPreferredInlineDay,
  updateDraftProject
} from '../src/components/table/tableEditingUtils.js';

function toLocalIso(day, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(`${day}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

test('canEditTableRow only allows editable system rows with current project access', () => {
  assert.equal(
    canEditTableRow({ rowType: 'system', hasProjectAccess: true }),
    true
  );

  assert.equal(
    canEditTableRow({ rowType: 'system', hasProjectAccess: false }),
    false
  );

  assert.equal(
    canEditTableRow({ rowType: 'artia_only', hasProjectAccess: true }),
    false
  );
});

test('updateDraftProject resets activity when project changes', () => {
  assert.deepEqual(
    updateDraftProject({
      project: '1360',
      activityLabel: 'Desenvolvimento',
      notes: 'manter'
    }, '2000'),
    {
      project: '2000',
      activityLabel: '',
      notes: 'manter'
    }
  );
});

test('buildInlineDraft keeps existing event data and supports new draft rows', () => {
  assert.deepEqual(
    buildInlineDraft({
      row: {
        day: '2026-03-25',
        start: toLocalIso('2026-03-25', '08:00'),
        end: toLocalIso('2026-03-25', '09:00'),
        project: '1360',
        activityLabel: 'Desenvolvimento',
        notes: 'Linha existente',
        artiaLaunched: true,
        workplace: 'Casa'
      }
    }),
    {
      day: '2026-03-25',
      startTime: '08:00',
      endTime: '09:00',
      project: '1360',
      activityLabel: 'Desenvolvimento',
      notes: 'Linha existente',
      artiaLaunched: true,
      workplace: 'Casa'
    }
  );

  assert.equal(
    buildInlineDraft({ fallbackDay: '2026-03-26' }).day,
    '2026-03-26'
  );
});

test('buildInlineDraftRow mirrors the draft fields into the table row structure', () => {
  assert.deepEqual(
    buildInlineDraftRow({
      day: '2026-03-26',
      startTime: '08:00',
      endTime: '08:50',
      project: '1360',
      activityLabel: 'Desenvolvimento',
      notes: 'Rascunho',
      artiaLaunched: true,
      workplace: 'Casa'
    }),
    {
      id: 'draft-inline',
      rowType: 'draft',
      day: '2026-03-26',
      start: toLocalIso('2026-03-26', '08:00'),
      end: toLocalIso('2026-03-26', '08:50'),
      effortMinutes: 0,
      project: '1360',
      activityLabel: 'Desenvolvimento',
      activityId: '',
      notes: 'Rascunho',
      artiaLaunched: true,
      workplace: 'Casa',
      hasProjectAccess: true
    }
  );
});

test('buildInlineEventPayload omits empty workplace while keeping other optional values normalized', () => {
  assert.deepEqual(
    buildInlineEventPayload(
      {
        day: '2026-03-26',
        startTime: '08:00',
        endTime: '08:50',
        notes: '',
        artiaLaunched: false,
        workplace: ''
      },
      { number: '1360' },
      { id: 'A1', label: 'Desenvolvimento' }
    ),
    {
      start: toLocalIso('2026-03-26', '08:00'),
      end: toLocalIso('2026-03-26', '08:50'),
      day: '2026-03-26',
      project: '1360',
      activity: {
        id: 'A1',
        label: 'Desenvolvimento'
      },
      notes: '',
      artiaLaunched: false
    }
  );

  assert.deepEqual(
    buildInlineEventPayload(
      {
        day: '2026-03-26',
        startTime: '09:00',
        endTime: '09:50',
        notes: '',
        artiaLaunched: true,
        workplace: 'Casa'
      },
      { number: '1360' },
      { id: 'A1', label: 'Desenvolvimento' }
    ),
    {
      start: toLocalIso('2026-03-26', '09:00'),
      end: toLocalIso('2026-03-26', '09:50'),
      day: '2026-03-26',
      project: '1360',
      activity: {
        id: 'A1',
        label: 'Desenvolvimento'
      },
      notes: '',
      artiaLaunched: true,
      workplace: 'Casa'
    }
  );
});

test('getPreferredInlineDay prefers today only when it is inside the current range', () => {
  assert.equal(
    getPreferredInlineDay({
      startDate: '2026-03-24',
      endDate: '2026-03-30',
      todayIso: '2026-03-26'
    }),
    '2026-03-26'
  );

  assert.equal(
    getPreferredInlineDay({
      startDate: '2026-03-24',
      endDate: '2026-03-30',
      todayIso: '2026-04-01'
    }),
    '2026-03-24'
  );
});
