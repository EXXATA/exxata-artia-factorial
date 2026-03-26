import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EDITABLE_TABLE_CELL_ORDER,
  applyCellDraftChange,
  buildCellCommitPlan,
  getCellNavigationIntent,
  getNextActiveCell,
  shouldSkipDraftCommitForSelectionFlow
} from '../src/components/table/tableCellEditingUtils.js';

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

function buildDraft(overrides = {}) {
  return {
    day: '2026-03-26',
    startTime: '08:00',
    endTime: '08:50',
    project: '1360',
    activityLabel: 'Desenvolvimento',
    notes: 'Observacao',
    artiaLaunched: false,
    workplace: '',
    ...overrides
  };
}

function buildRows() {
  return [
    { id: 'evt-1', rowType: 'system', day: '2026-03-25', hasProjectAccess: true },
    { id: 'remote-1', rowType: 'artia_only', day: '2026-03-25', hasProjectAccess: true },
    { id: 'evt-2', rowType: 'system', day: '2026-03-26', hasProjectAccess: true }
  ];
}

test('editable cell order reflects excel-like navigation without the actions column', () => {
  assert.deepEqual(EDITABLE_TABLE_CELL_ORDER, [
    'day',
    'project',
    'startTime',
    'endTime',
    'activityLabel',
    'notes',
    'status'
  ]);
});

test('applyCellDraftChange resets activity when project changes and updates status fields independently', () => {
  assert.deepEqual(
    applyCellDraftChange(buildDraft(), 'project', '2000'),
    buildDraft({
      project: '2000',
      activityLabel: ''
    })
  );

  assert.deepEqual(
    applyCellDraftChange(buildDraft(), 'status', {
      artiaLaunched: true,
      workplace: 'Casa'
    }),
    buildDraft({
      artiaLaunched: true,
      workplace: 'Casa'
    })
  );
});

test('getNextActiveCell moves horizontally and vertically across editable rows only', () => {
  const rows = buildRows();

  assert.deepEqual(
    getNextActiveCell({
      rows,
      activeCell: { rowId: 'evt-1', columnKey: 'project' },
      direction: 'horizontal'
    }),
    { rowId: 'evt-1', columnKey: 'startTime' }
  );

  assert.deepEqual(
    getNextActiveCell({
      rows,
      activeCell: { rowId: 'evt-1', columnKey: 'project' },
      direction: 'vertical'
    }),
    { rowId: 'evt-2', columnKey: 'project' }
  );
});

test('getCellNavigationIntent keeps spreadsheet navigation while saving on Enter and Escape', () => {
  assert.equal(getCellNavigationIntent('Tab'), 'horizontal');
  assert.equal(getCellNavigationIntent('Enter'), 'vertical');
  assert.equal(getCellNavigationIntent('Escape'), 'close');
  assert.equal(getCellNavigationIntent('ArrowRight'), null);
});

test('buildCellCommitPlan defers project commits until a valid activity is selected', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'evt-1', rowType: 'system' },
    columnKey: 'project',
    draft: buildDraft({ project: '2000', activityLabel: '' }),
    projects: buildProjects()
  });

  assert.deepEqual(plan, {
    type: 'defer',
    reason: 'awaiting_activity_selection',
    committedFields: ['project', 'activityLabel']
  });
});

test('buildCellCommitPlan saves project and activity together for existing rows', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'evt-1', rowType: 'system' },
    columnKey: 'activityLabel',
    draft: buildDraft({ project: '2000', activityLabel: 'Discovery' }),
    projects: buildProjects()
  });

  assert.equal(plan.type, 'update');
  assert.deepEqual(plan.committedFields, ['project', 'activityLabel']);
  assert.equal(plan.payload.project, '2000');
  assert.deepEqual(plan.payload.activity, {
    id: 'B1',
    label: 'Discovery'
  });
});

test('buildCellCommitPlan updates time fields as a single bundle for existing rows', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'evt-1', rowType: 'system' },
    columnKey: 'startTime',
    draft: buildDraft({ startTime: '09:00', endTime: '09:50' }),
    projects: buildProjects()
  });

  assert.equal(plan.type, 'update');
  assert.deepEqual(plan.committedFields, ['day', 'startTime', 'endTime']);
  assert.deepEqual(plan.payload, {
    start: new Date('2026-03-26T09:00:00').toISOString(),
    end: new Date('2026-03-26T09:50:00').toISOString(),
    day: '2026-03-26'
  });
});

test('buildCellCommitPlan updates notes independently from unfinished project or time drafts', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'evt-1', rowType: 'system' },
    columnKey: 'notes',
    draft: buildDraft({
      project: '2000',
      activityLabel: '',
      startTime: '10:00',
      endTime: '09:00',
      notes: 'Notas locais'
    }),
    projects: buildProjects()
  });

  assert.deepEqual(plan, {
    type: 'update',
    payload: {
      notes: 'Notas locais'
    },
    committedFields: ['notes']
  });
});

test('buildCellCommitPlan updates status independently for existing rows', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'evt-1', rowType: 'system' },
    columnKey: 'status',
    draft: buildDraft({
      artiaLaunched: true,
      workplace: 'Casa'
    }),
    projects: buildProjects()
  });

  assert.deepEqual(plan, {
    type: 'update',
    payload: {
      artiaLaunched: true,
      workplace: 'Casa'
    },
    committedFields: ['artiaLaunched', 'workplace']
  });
});

test('buildCellCommitPlan normalizes status payload with workplace vazio para null', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'evt-1', rowType: 'system' },
    columnKey: 'status',
    draft: buildDraft({
      artiaLaunched: false,
      workplace: ''
    }),
    projects: buildProjects()
  });

  assert.deepEqual(plan, {
    type: 'update',
    payload: {
      artiaLaunched: false,
      workplace: null
    },
    committedFields: ['artiaLaunched', 'workplace']
  });
});

test('buildCellCommitPlan creates the event when a draft row becomes valid', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'draft-inline', rowType: 'draft' },
    columnKey: 'activityLabel',
    draft: buildDraft(),
    projects: buildProjects()
  });

  assert.equal(plan.type, 'create');
  assert.equal(plan.payload.day, '2026-03-26');
  assert.equal(plan.payload.project, '1360');
});

test('buildCellCommitPlan allows draft creates from time, notes and status once selection is complete', () => {
  const timePlan = buildCellCommitPlan({
    row: { id: 'draft-inline', rowType: 'draft' },
    columnKey: 'endTime',
    draft: buildDraft({ startTime: '09:00', endTime: '09:50' }),
    projects: buildProjects()
  });
  const notesPlan = buildCellCommitPlan({
    row: { id: 'draft-inline', rowType: 'draft' },
    columnKey: 'notes',
    draft: buildDraft({ notes: 'Notas finais' }),
    projects: buildProjects()
  });
  const statusPlan = buildCellCommitPlan({
    row: { id: 'draft-inline', rowType: 'draft' },
    columnKey: 'status',
    draft: buildDraft({ artiaLaunched: true, workplace: 'Casa' }),
    projects: buildProjects()
  });

  assert.equal(timePlan.type, 'create');
  assert.equal(timePlan.payload.start, new Date('2026-03-26T09:00:00').toISOString());
  assert.equal(timePlan.payload.end, new Date('2026-03-26T09:50:00').toISOString());
  assert.equal(notesPlan.type, 'create');
  assert.equal(notesPlan.payload.notes, 'Notas finais');
  assert.equal(statusPlan.type, 'create');
  assert.equal(statusPlan.payload.artiaLaunched, true);
  assert.equal(statusPlan.payload.workplace, 'Casa');
});

test('shouldSkipDraftCommitForSelectionFlow keeps the draft editable while moving through setup fields', () => {
  assert.equal(
    shouldSkipDraftCommitForSelectionFlow({
      row: { id: 'draft-inline', rowType: 'draft' },
      columnKey: 'activityLabel',
      queuedActivation: { rowId: 'draft-inline', columnKey: 'startTime' }
    }),
    true
  );

  assert.equal(
    shouldSkipDraftCommitForSelectionFlow({
      row: { id: 'draft-inline', rowType: 'draft' },
      columnKey: 'startTime',
      queuedActivation: { rowId: 'draft-inline', columnKey: 'endTime' }
    }),
    true
  );

  assert.equal(
    shouldSkipDraftCommitForSelectionFlow({
      row: { id: 'draft-inline', rowType: 'draft' },
      columnKey: 'activityLabel',
      queuedActivation: { rowId: 'draft-inline', columnKey: 'notes' }
    }),
    false
  );

  assert.equal(
    shouldSkipDraftCommitForSelectionFlow({
      row: { id: 'evt-1', rowType: 'system' },
      columnKey: 'activityLabel',
      queuedActivation: { rowId: 'evt-1', columnKey: 'startTime' }
    }),
    false
  );
});

test('buildCellCommitPlan resolves the activity id from the selected project when labels repeat across projects', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'draft-inline', rowType: 'draft' },
    columnKey: 'activityLabel',
    draft: buildDraft({
      project: '0486',
      activityLabel: '16.2 - Redacao de Carta a Pedido do Cliente'
    }),
    projects: [
      ...buildProjects(),
      {
        id: 'project-3',
        number: '0329',
        name: 'Projeto Gamma',
        activities: [
          { id: 'activity-4', artiaId: 'C1', label: '16.2 - Redacao de Carta a Pedido do Cliente' }
        ]
      },
      {
        id: 'project-4',
        number: '0486',
        name: 'Projeto Delta',
        activities: [
          { id: 'activity-5', artiaId: 'D1', label: '16.2 - Redacao de Carta a Pedido do Cliente' }
        ]
      }
    ]
  });

  assert.equal(plan.type, 'create');
  assert.equal(plan.payload.project, '0486');
  assert.deepEqual(plan.payload.activity, {
    id: 'D1',
    label: '16.2 - Redacao de Carta a Pedido do Cliente'
  });
});

test('buildCellCommitPlan does not persist incomplete draft rows for independent cells', () => {
  const plan = buildCellCommitPlan({
    row: { id: 'draft-inline', rowType: 'draft' },
    columnKey: 'notes',
    draft: buildDraft({
      project: '',
      activityLabel: ''
    }),
    projects: buildProjects()
  });

  assert.deepEqual(plan, {
    type: 'defer',
    reason: 'draft_not_ready',
    committedFields: ['notes']
  });
});
