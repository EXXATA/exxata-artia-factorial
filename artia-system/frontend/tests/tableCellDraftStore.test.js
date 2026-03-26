import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCellCommitPlan } from '../src/components/table/tableCellEditingUtils.js';
import {
  readDraftSnapshot,
  resolveNextDraftSnapshot,
  setDraftSnapshot
} from '../src/components/table/tableCellDraftStore.js';

function buildProjects() {
  return [
    {
      id: 'project-1',
      number: '1360',
      name: 'Projeto Alpha',
      activities: [
        { id: 'activity-1', artiaId: 'A1', label: 'Desenvolvimento' }
      ]
    }
  ];
}

function buildDraft(overrides = {}) {
  return {
    day: '2026-03-26',
    startTime: '08:00',
    endTime: '08:50',
    project: '1360',
    activityLabel: '',
    notes: '',
    artiaLaunched: false,
    workplace: '',
    ...overrides
  };
}

test('resolveNextDraftSnapshot promotes the latest draft immediately for draft-row creates', () => {
  const initialDraftRows = {
    'draft-inline': buildDraft()
  };

  const { nextDraft, nextDraftRowsById } = resolveNextDraftSnapshot({
    currentDraftRows: initialDraftRows,
    rowId: 'draft-inline',
    updater: (currentDraft) => ({
      ...currentDraft,
      activityLabel: 'Desenvolvimento'
    })
  });

  assert.equal(nextDraft.activityLabel, 'Desenvolvimento');
  assert.equal(
    readDraftSnapshot({
      rowId: 'draft-inline',
      draftRowsById: nextDraftRowsById
    }).activityLabel,
    'Desenvolvimento'
  );

  const commitPlan = buildCellCommitPlan({
    row: { id: 'draft-inline', rowType: 'draft' },
    columnKey: 'activityLabel',
    draft: nextDraft,
    projects: buildProjects()
  });

  assert.equal(commitPlan.type, 'create');
  assert.deepEqual(commitPlan.payload.activity, {
    id: 'A1',
    label: 'Desenvolvimento'
  });
});

test('setDraftSnapshot removes a draft row cleanly after a successful create', () => {
  const currentDraftRows = {
    'draft-inline': buildDraft({ activityLabel: 'Desenvolvimento' }),
    'evt-1': buildDraft({ notes: 'Existente' })
  };

  const nextDraftRows = setDraftSnapshot(currentDraftRows, 'draft-inline', null);

  assert.deepEqual(nextDraftRows, {
    'evt-1': buildDraft({ notes: 'Existente' })
  });
});
