import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeProjectFilterOptions,
  mergeActivityFilterOptions
} from '../src/utils/viewFilterOptions.js';

test('mergeProjectFilterOptions preserves catalog entries and adds historical read-side projects by key', () => {
  const projects = mergeProjectFilterOptions({
    catalogProjects: [
      { key: '10', id: '10', number: '1360', name: 'Projeto Alpha', label: '1360 - Projeto Alpha' }
    ],
    availableProjects: [
      { key: '10', id: '10', number: '1360', name: 'Projeto Alpha', label: '1360 - Projeto Alpha' },
      { key: 'legacy-9999', id: '', number: '9999', name: 'Projeto legado', label: '9999 - Projeto legado' }
    ]
  });

  assert.deepEqual(projects.map((project) => project.key), ['10', 'legacy-9999']);
  assert.equal(projects[1].label, '9999 - Projeto legado');
});

test('mergeActivityFilterOptions keeps project-scoped catalog activities and appends historical read-side activities', () => {
  const activities = mergeActivityFilterOptions({
    catalogProjects: [
      {
        key: '10',
        id: '10',
        number: '1360',
        name: 'Projeto Alpha',
        activities: [
          { id: '501', artiaId: '9001', label: 'Desenvolvimento' }
        ]
      }
    ],
    availableActivities: [
      { key: '9001', projectKey: '10', activityId: '9001', activityLabel: 'Desenvolvimento' },
      { key: 'legacy-sem-id', projectKey: '10', activityId: '', activityLabel: 'Legado sem ID' }
    ],
    selectedProjectKey: '10'
  });

  assert.deepEqual(activities.map((activity) => activity.key), ['9001', 'legacy-sem-id']);
  assert.equal(activities[0].value, '9001');
  assert.equal(activities[1].value, 'legacy-sem-id');
});
