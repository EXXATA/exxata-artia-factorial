import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_OPTIMISTIC_FIELDS,
  areRowsEquivalent,
  buildOptimisticSystemRow,
  pruneStaleOptimisticRows,
  restoreCommittedFieldValues,
  setOptimisticRow,
  toggleCellFlag
} from '../src/components/table/tableCellStateUtils.js';

test('toggleCellFlag adiciona e remove flags por linha sem deixar colecoes vazias', () => {
  const withDay = toggleCellFlag({}, 'evt-1', 'day', true);
  assert.deepEqual(withDay, { 'evt-1': ['day'] });

  const withProject = toggleCellFlag(withDay, 'evt-1', 'project', true);
  assert.deepEqual(withProject, { 'evt-1': ['day', 'project'] });

  const withoutDay = toggleCellFlag(withProject, 'evt-1', 'day', false);
  assert.deepEqual(withoutDay, { 'evt-1': ['project'] });

  const cleared = toggleCellFlag(withoutDay, 'evt-1', 'project', false);
  assert.deepEqual(cleared, {});
});

test('buildOptimisticSystemRow e pruneStaleOptimisticRows preservam apenas divergencias reais', () => {
  const matchingServerRow = {
    id: 'evt-1',
    start: '2026-03-26T11:00:00.000Z',
    end: '2026-03-26T11:50:00.000Z',
    day: '2026-03-26',
    project: '1360',
    activityId: 'A1',
    activityLabel: 'Desenvolvimento',
    notes: '',
    artiaLaunched: false,
    workplace: null,
    hasProjectAccess: true
  };
  const divergentRow = {
    ...matchingServerRow,
    id: 'evt-2',
    notes: 'Alteracao local'
  };

  const optimisticRows = {
    'evt-1': buildOptimisticSystemRow(matchingServerRow),
    'evt-2': buildOptimisticSystemRow(divergentRow)
  };

  assert.equal(areRowsEquivalent(matchingServerRow, optimisticRows['evt-1']), true);
  assert.deepEqual(
    pruneStaleOptimisticRows(optimisticRows, [
      matchingServerRow,
      {
        ...divergentRow,
        notes: ''
      }
    ]),
    {
      'evt-2': optimisticRows['evt-2']
    }
  );
});

test('setOptimisticRow e restoreCommittedFieldValues mantem somente o necessario no estado local', () => {
  const currentCollection = {
    'evt-1': { id: 'evt-1', notes: 'Local' }
  };

  assert.deepEqual(setOptimisticRow(currentCollection, 'evt-1', null), {});
  assert.deepEqual(
    setOptimisticRow({}, 'evt-2', { id: 'evt-2', notes: 'Novo' }),
    { 'evt-2': { id: 'evt-2', notes: 'Novo' } }
  );

  const restoredDraft = restoreCommittedFieldValues({
    persistedDraft: {
      day: '2026-03-26',
      startTime: '08:00',
      endTime: '08:50',
      project: '1360',
      activityLabel: 'Desenvolvimento',
      notes: 'Servidor',
      artiaLaunched: false,
      workplace: ''
    },
    currentDraft: {
      day: '2026-03-26',
      startTime: '09:00',
      endTime: '09:50',
      project: '1360',
      activityLabel: 'Discovery',
      notes: 'Local',
      artiaLaunched: true,
      workplace: 'Casa'
    },
    committedFields: ['notes', 'artiaLaunched']
  });

  assert.deepEqual(restoredDraft, {
    day: '2026-03-26',
    startTime: '09:00',
    endTime: '09:50',
    project: '1360',
    activityLabel: 'Discovery',
    notes: 'Servidor',
    artiaLaunched: false,
    workplace: 'Casa'
  });
  assert.deepEqual(ALL_OPTIMISTIC_FIELDS, [
    'day',
    'startTime',
    'endTime',
    'project',
    'activityLabel',
    'notes',
    'artiaLaunched',
    'workplace'
  ]);
});
