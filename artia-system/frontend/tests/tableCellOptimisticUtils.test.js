import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOptimisticRowFromDraft } from '../src/components/table/tableCellOptimisticUtils.js';

function buildProjects() {
  return [
    {
      id: 'project-1',
      number: '1360',
      name: 'Projeto Alpha',
      activities: [
        { id: 'activity-1', artiaId: 'A1', label: 'Desenvolvimento' },
        { id: 'activity-2', artiaId: 'A2', label: 'Homologacao' }
      ]
    },
    {
      id: 'project-2',
      number: '2000',
      name: 'Projeto Beta',
      activities: [
        { id: 'activity-3', artiaId: 'B1', label: 'Discovery' }
      ]
    }
  ];
}

function buildSystemRow(overrides = {}) {
  return {
    id: 'evt-1',
    rowType: 'system',
    day: '2026-03-26',
    start: '2026-03-26T08:00:00.000Z',
    end: '2026-03-26T08:50:00.000Z',
    project: '1360',
    activityId: 'A1',
    activityLabel: 'Desenvolvimento',
    notes: 'Antes',
    artiaLaunched: false,
    workplace: null,
    hasProjectAccess: true,
    artiaSyncStatus: 'PENDING',
    ...overrides
  };
}

function buildDraft(overrides = {}) {
  return {
    day: '2026-03-26',
    startTime: '09:00',
    endTime: '09:50',
    project: '2000',
    activityLabel: 'Discovery',
    notes: 'Depois',
    artiaLaunched: true,
    workplace: 'Casa',
    ...overrides
  };
}

function isoLocal(day, time) {
  return new Date(`${day}T${time}:00`).toISOString();
}

test('buildOptimisticRowFromDraft aplica imediatamente os campos alterados em linhas existentes', () => {
  const optimisticRow = buildOptimisticRowFromDraft({
    row: buildSystemRow(),
    draft: buildDraft(),
    committedFields: ['day', 'startTime', 'endTime', 'project', 'activityLabel', 'notes', 'artiaLaunched', 'workplace'],
    projects: buildProjects()
  });

  assert.deepEqual(optimisticRow, {
    id: 'evt-1',
    rowType: 'system',
    day: '2026-03-26',
    start: isoLocal('2026-03-26', '09:00'),
    end: isoLocal('2026-03-26', '09:50'),
    project: '2000',
    activityId: 'B1',
    activityLabel: 'Discovery',
    notes: 'Depois',
    artiaLaunched: true,
    workplace: 'Casa',
    hasProjectAccess: true,
    artiaSyncStatus: 'PENDING',
    effortMinutes: 50
  });
});

test('buildOptimisticRowFromDraft cria uma linha temporaria de sistema para commits locais antes da resposta do backend', () => {
  const optimisticRow = buildOptimisticRowFromDraft({
    row: {
      id: 'draft-inline',
      rowType: 'draft'
    },
    draft: buildDraft({
      day: '2026-03-27',
      startTime: '10:00',
      endTime: '11:10'
    }),
    committedFields: ['project', 'activityLabel'],
    projects: buildProjects(),
    nextRowId: 'temp-inline-1'
  });

  assert.deepEqual(optimisticRow, {
    id: 'temp-inline-1',
    rowType: 'system',
    day: '2026-03-27',
    start: isoLocal('2026-03-27', '10:00'),
    end: isoLocal('2026-03-27', '11:10'),
    project: '2000',
    activityId: 'B1',
    activityLabel: 'Discovery',
    notes: 'Depois',
    artiaLaunched: true,
    workplace: 'Casa',
    hasProjectAccess: true,
    effortMinutes: 70
  });
});
