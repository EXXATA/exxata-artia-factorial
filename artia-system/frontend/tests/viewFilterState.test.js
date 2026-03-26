import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveViewFilterValue,
  reconcileProjectAndActivityFilters,
  reconcileProjectFilter
} from '../src/utils/viewFilterState.js';

test('getActiveViewFilterValue omite o sentinela ALL para requests', () => {
  assert.equal(getActiveViewFilterValue('ALL'), undefined);
  assert.equal(getActiveViewFilterValue('project-alpha'), 'project-alpha');
});

test('reconcileProjectAndActivityFilters limpa atividade quando projeto ou atividade ficam invalidos', () => {
  const result = reconcileProjectAndActivityFilters({
    projectFilter: 'project-missing',
    activityFilter: 'activity-missing',
    projectOptions: [{ key: 'project-alpha' }],
    activityOptions: [{ key: 'activity-dev' }]
  });

  assert.deepEqual(result, {
    projectFilter: 'ALL',
    activityFilter: 'ALL'
  });
});

test('reconcileProjectFilter preserva a selecao quando a chave ainda existe', () => {
  assert.equal(
    reconcileProjectFilter('project-alpha', [{ key: 'project-alpha' }, { key: 'project-beta' }]),
    'project-alpha'
  );
});
