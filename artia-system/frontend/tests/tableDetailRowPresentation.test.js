import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTableDetailRowPresentation } from '../src/components/table/tableDetailRowPresentation.js';

test('buildTableDetailRowPresentation resolve derivados da linha editavel sem alterar o contrato visual', () => {
  const result = buildTableDetailRowPresentation({
    event: {
      id: 'evt-1',
      rowType: 'system',
      day: '2026-03-26',
      start: '2026-03-26T11:00:00.000Z',
      end: '2026-03-26T11:50:00.000Z',
      effortMinutes: 50,
      project: '1360',
      activityId: 'A1',
      activityLabel: 'Desenvolvimento',
      notes: 'Original',
      artiaLaunched: false,
      workplace: null,
      artiaSyncStatus: 'pending',
      hasProjectAccess: true
    },
    rowDraft: {
      day: '2026-03-26',
      startTime: '09:00',
      endTime: '09:30',
      project: '1360',
      activityLabel: 'Discovery',
      notes: 'Editado',
      artiaLaunched: true,
      workplace: 'Casa'
    },
    dailyDetailsByDate: {
      '2026-03-26': {
        artiaHours: 8.5,
        factorialHours: 7.25
      }
    },
    minutesByDay: {
      '2026-03-26': 240
    },
    projects: [
      {
        id: 'project-1',
        number: '1360',
        name: 'Projeto Alpha',
        activities: [
          { id: 'activity-1', artiaId: 'A1', label: 'Desenvolvimento' },
          { id: 'activity-2', artiaId: 'A2', label: 'Discovery' }
        ]
      }
    ],
    isRowPending: false
  });

  assert.equal(result.isDraftRow, false);
  assert.equal(result.editable, true);
  assert.equal(result.draftDay, '2026-03-26');
  assert.equal(result.effortMinutes, 30);
  assert.equal(result.rowDayMinutes, 220);
  assert.equal(result.computedActivityId, 'A2');
  assert.equal(result.syncPresentation.label, 'Pendente');
  assert.equal(result.selectedProject?.number, '1360');
  assert.equal(result.selectedActivity?.label, 'Discovery');
});
