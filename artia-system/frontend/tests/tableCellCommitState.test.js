import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCreateCommitSuccessState } from '../src/components/table/tableCellCommitState.js';

test('applyCreateCommitSuccessState promove draft-inline para o evento persistido sem perder o foco atual', () => {
  const initialDraft = {
    day: '2026-03-26',
    startTime: '08:00',
    endTime: '08:50',
    project: '1360',
    activityLabel: 'Desenvolvimento',
    notes: '',
    artiaLaunched: false,
    workplace: ''
  };
  const persistedEvent = {
    id: 'evt-99',
    day: '2026-03-26',
    start: '2026-03-26T11:00:00.000Z',
    end: '2026-03-26T11:50:00.000Z',
    project: '1360',
    activityId: 'A1',
    activityLabel: 'Desenvolvimento',
    notes: '',
    artiaLaunched: false,
    workplace: null,
    updatedAt: '2026-03-26T12:00:00.000Z'
  };

  const result = applyCreateCommitSuccessState({
    draftRowsRefCurrent: {
      'draft-inline': initialDraft,
      'evt-1': {
        ...initialDraft,
        notes: 'Existente'
      }
    },
    draftRowsById: {
      'draft-inline': initialDraft,
      'evt-1': {
        ...initialDraft,
        notes: 'Existente'
      }
    },
    persistedDraftsById: {
      'draft-inline': initialDraft
    },
    persistedEvent,
    activeCell: {
      rowId: 'draft-inline',
      columnKey: 'activityLabel'
    }
  });

  assert.equal(result.persistedDraft.activityLabel, 'Desenvolvimento');
  assert.equal(result.nextDraftRowsRefCurrent['draft-inline'], undefined);
  assert.equal(result.nextDraftRowsById['draft-inline'], undefined);
  assert.equal(result.nextPersistedDraftsById['draft-inline'], undefined);
  assert.equal(result.nextDraftRowsById['evt-99'].startTime, '08:00');
  assert.deepEqual(result.nextActiveCell, {
    rowId: 'evt-99',
    columnKey: 'activityLabel'
  });
  assert.equal(result.lastSavedAt, '2026-03-26T12:00:00.000Z');
});
