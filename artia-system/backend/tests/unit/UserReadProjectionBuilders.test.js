import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRangeSummaryResponse } from '../../src/application/services/user-read-projection/rangeSummaryBuilder.js';
import { buildWeekViewResponse } from '../../src/application/services/user-read-projection/weekViewBuilder.js';

test('buildWeekViewResponse keeps historical events in the summary even without current access', () => {
  const eventRows = [
    {
      event_id: 'evt-1',
      day: '2026-03-10',
      start_time: '2026-03-10T08:00:00.000Z',
      end_time: '2026-03-10T10:00:00.000Z',
      project: '1360',
      project_key: '1',
      project_id: '1',
      project_number: '1360',
      project_name: 'Projeto acessivel',
      project_label: '1360 - Projeto acessivel',
      project_display_label: '1360 - Projeto acessivel',
      activity_id: 'A1',
      activity_label: 'Atividade',
      notes: '',
      artia_launched: false,
      sync_status: 'synced',
      sync_label: 'Sincronizado',
      remote_entry_id: 'artia-1',
      remote_project: '1360 - Projeto acessivel',
      remote_activity: 'Atividade',
      remote_hours: 2,
      remote_start: '2026-03-10T08:00:00.000Z',
      remote_end: '2026-03-10T10:00:00.000Z',
      has_project_access: true,
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_sync_reason: null
    },
    {
      event_id: 'evt-2',
      day: '2026-03-10',
      start_time: '2026-03-10T10:00:00.000Z',
      end_time: '2026-03-10T12:00:00.000Z',
      project: '9999',
      project_key: 'legacy-9999',
      project_id: null,
      project_number: '9999',
      project_name: 'Projeto sem acesso',
      project_label: '9999',
      project_display_label: '9999',
      activity_id: 'A2',
      activity_label: 'Legado',
      notes: '',
      artia_launched: true,
      sync_status: 'manual',
      sync_label: 'Marcado manualmente',
      remote_entry_id: null,
      remote_project: null,
      remote_activity: null,
      remote_hours: 0,
      remote_start: null,
      remote_end: null,
      has_project_access: false,
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_sync_reason: null
    }
  ];

  const dayRows = [
    {
      day: '2026-03-10',
      factorial_hours: 8,
      system_hours: 4,
      synced_hours: 2,
      pending_hours: 2,
      manual_hours: 2,
      artia_hours: 3,
      artia_entry_count: 2,
      remote_only_count: 1,
      remote_only_entries_json: [
        {
          id: 'artia-2',
          day: '2026-03-10',
          hours: 1,
          projectKey: '1',
          projectId: '1',
          projectNumber: '1360',
          projectName: 'Projeto acessivel',
          projectLabel: '1360 - Projeto acessivel',
          projectDisplayLabel: '1360 - Projeto acessivel',
          activityId: 'A3',
          activityLabel: 'Extra'
        }
      ],
      artia_entries_json: [
        {
          id: 'artia-1',
          day: '2026-03-10',
          hours: 2,
          projectKey: '1',
          projectId: '1',
          projectNumber: '1360',
          projectName: 'Projeto acessivel',
          projectLabel: '1360 - Projeto acessivel',
          projectDisplayLabel: '1360 - Projeto acessivel',
          activityId: 'A1',
          activityLabel: 'Atividade'
        },
        {
          id: 'artia-2',
          day: '2026-03-10',
          hours: 1,
          projectKey: '1',
          projectId: '1',
          projectNumber: '1360',
          projectName: 'Projeto acessivel',
          projectLabel: '1360 - Projeto acessivel',
          projectDisplayLabel: '1360 - Projeto acessivel',
          activityId: 'A3',
          activityLabel: 'Extra'
        }
      ],
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_read_reason: null,
      last_computed_at: '2026-03-10T12:00:00.000Z'
    }
  ];

  const result = buildWeekViewResponse(eventRows, dayRows, {
    startDate: '2026-03-10',
    endDate: '2026-03-10'
  });

  assert.equal(result.events.length, 2);
  assert.equal(result.dailyDetails[0].systemEvents.length, 2);
  assert.equal(result.dailyDetails[0].systemHours, 4);
  assert.equal(result.stats.totalSystemHours, 4);
  assert.equal(result.dailyDetails[0].remoteOnlyArtiaEntries.length, 1);
});

test('buildRangeSummaryResponse preserves synced, pending and manual when filtering by activity', () => {
  const dayRows = [
    {
      day: '2026-03-10',
      factorial_hours: 8,
      system_hours: 4,
      synced_hours: 2,
      pending_hours: 2,
      manual_hours: 1,
      artia_hours: 3,
      artia_entry_count: 2,
      remote_only_count: 0,
      remote_only_entries_json: [],
      artia_entries_json: [],
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_read_reason: null,
      last_computed_at: '2026-03-10T12:00:00.000Z'
    }
  ];

  const activityRows = [
    {
      day: '2026-03-10',
      project_key: '1',
      project_id: '1',
      project_number: '1360',
      project_name: 'Projeto acessivel',
      project_label: '1360 - Projeto acessivel',
      activity_key: '1::A1',
      activity_id: 'A1',
      activity_label: 'Atividade',
      system_hours: 4,
      synced_hours: 2,
      pending_hours: 2,
      manual_hours: 1,
      system_event_count: 2,
      artia_hours: 3,
      artia_entry_count: 2,
      remote_only_hours: 0,
      remote_only_entry_count: 0
    }
  ];

  const result = buildRangeSummaryResponse(dayRows, [], activityRows, {
    startDate: '2026-03-10',
    endDate: '2026-03-10',
    activity: 'Atividade'
  });

  assert.equal(result.dailyDetails[0].systemHours, 4);
  assert.equal(result.dailyDetails[0].syncedSystemHours, 2);
  assert.equal(result.dailyDetails[0].pendingSystemHours, 2);
  assert.equal(result.dailyDetails[0].manualSystemHours, 1);
  assert.equal(result.stats.totalPendingSystemHours, 2);
  assert.equal(result.stats.totalManualSystemHours, 1);
});

test('buildWeekViewResponse exposes accessible project metadata independently from week filters', () => {
  const eventRows = [
    {
      event_id: 'evt-1',
      day: '2026-03-10',
      start_time: '2026-03-10T08:00:00.000Z',
      end_time: '2026-03-10T10:00:00.000Z',
      project: '1360',
      project_key: '1',
      project_id: '1',
      project_number: '1360',
      project_name: 'Projeto acessivel',
      project_label: '1360 - Projeto acessivel',
      project_display_label: '1360 - Projeto acessivel',
      activity_id: 'A1',
      activity_label: 'Atividade',
      notes: '',
      artia_launched: false,
      sync_status: 'synced',
      sync_label: 'Sincronizado',
      remote_entry_id: 'artia-1',
      remote_project: '1360 - Projeto acessivel',
      remote_activity: 'Atividade',
      remote_hours: 2,
      remote_start: '2026-03-10T08:00:00.000Z',
      remote_end: '2026-03-10T10:00:00.000Z',
      has_project_access: true,
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_sync_reason: null
    }
  ];

  const dayRows = [
    {
      day: '2026-03-10',
      factorial_hours: 8,
      system_hours: 2,
      synced_hours: 2,
      pending_hours: 0,
      manual_hours: 0,
      artia_hours: 2,
      artia_entry_count: 1,
      remote_only_count: 0,
      remote_only_entries_json: [],
      artia_entries_json: [
        {
          id: 'artia-1',
          day: '2026-03-10',
          hours: 2,
          projectKey: '1',
          projectId: '1',
          projectNumber: '1360',
          projectName: 'Projeto acessivel',
          projectLabel: '1360 - Projeto acessivel',
          projectDisplayLabel: '1360 - Projeto acessivel',
          activityId: 'A1',
          activityLabel: 'Atividade'
        }
      ],
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_read_reason: null,
      last_computed_at: '2026-03-10T12:00:00.000Z'
    }
  ];

  const result = buildWeekViewResponse(eventRows, dayRows, {
    startDate: '2026-03-10',
    endDate: '2026-03-10',
    project: '1360',
    accessibleProjectCount: 23,
    projectAccessLastSyncedAt: '2026-03-10T12:30:00.000Z'
  });

  assert.equal(result.events.length, 1);
  assert.equal(result.dailyDetails[0].systemEvents.length, 1);
  assert.equal(result.stats.projectCount, 1);
  assert.equal(result.meta.accessibleProjectCount, 23);
  assert.equal(result.meta.projectAccessLastSyncedAt, '2026-03-10T12:30:00.000Z');
});

test('buildWeekViewResponse filters by exact projectKey and activityKey without partial matches', () => {
  const eventRows = [
    {
      event_id: 'evt-1',
      day: '2026-03-10',
      start_time: '2026-03-10T08:00:00.000Z',
      end_time: '2026-03-10T09:00:00.000Z',
      project: '1360',
      project_key: 'project-alpha',
      project_id: '1',
      project_number: '1360',
      project_name: 'Projeto Alpha',
      project_label: '1360 - Projeto Alpha',
      project_display_label: '1360 - Projeto Alpha',
      activity_key: 'activity-dev',
      activity_id: 'A1',
      activity_label: 'Desenvolvimento',
      notes: '',
      artia_launched: false,
      sync_status: 'synced',
      sync_label: 'Sincronizado',
      remote_entry_id: 'artia-1',
      remote_project: '1360 - Projeto Alpha',
      remote_activity: 'Desenvolvimento',
      remote_hours: 1,
      remote_start: '2026-03-10T08:00:00.000Z',
      remote_end: '2026-03-10T09:00:00.000Z',
      has_project_access: true,
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_sync_reason: null
    },
    {
      event_id: 'evt-2',
      day: '2026-03-10',
      start_time: '2026-03-10T09:00:00.000Z',
      end_time: '2026-03-10T10:00:00.000Z',
      project: '1360A',
      project_key: 'project-alpha-extended',
      project_id: '2',
      project_number: '1360A',
      project_name: 'Projeto Alpha Extend',
      project_label: '1360A - Projeto Alpha Extend',
      project_display_label: '1360A - Projeto Alpha Extend',
      activity_key: 'activity-dev-extended',
      activity_id: 'A10',
      activity_label: 'Desenvolvimento extendido',
      notes: '',
      artia_launched: false,
      sync_status: 'synced',
      sync_label: 'Sincronizado',
      remote_entry_id: 'artia-2',
      remote_project: '1360A - Projeto Alpha Extend',
      remote_activity: 'Desenvolvimento extendido',
      remote_hours: 1,
      remote_start: '2026-03-10T09:00:00.000Z',
      remote_end: '2026-03-10T10:00:00.000Z',
      has_project_access: true,
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_sync_reason: null
    }
  ];

  const dayRows = [
    {
      day: '2026-03-10',
      factorial_hours: 8,
      system_hours: 2,
      synced_hours: 2,
      pending_hours: 0,
      manual_hours: 0,
      artia_hours: 2,
      artia_entry_count: 2,
      remote_only_count: 0,
      remote_only_entries_json: [],
      artia_entries_json: [
        {
          id: 'artia-1',
          day: '2026-03-10',
          hours: 1,
          projectKey: 'project-alpha',
          projectId: '1',
          projectNumber: '1360',
          projectName: 'Projeto Alpha',
          projectLabel: '1360 - Projeto Alpha',
          projectDisplayLabel: '1360 - Projeto Alpha',
          activityKey: 'activity-dev',
          activityId: 'A1',
          activityLabel: 'Desenvolvimento'
        },
        {
          id: 'artia-2',
          day: '2026-03-10',
          hours: 1,
          projectKey: 'project-alpha-extended',
          projectId: '2',
          projectNumber: '1360A',
          projectName: 'Projeto Alpha Extend',
          projectLabel: '1360A - Projeto Alpha Extend',
          projectDisplayLabel: '1360A - Projeto Alpha Extend',
          activityKey: 'activity-dev-extended',
          activityId: 'A10',
          activityLabel: 'Desenvolvimento extendido'
        }
      ],
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_read_reason: null,
      last_computed_at: '2026-03-10T12:00:00.000Z'
    }
  ];

  const result = buildWeekViewResponse(eventRows, dayRows, {
    startDate: '2026-03-10',
    endDate: '2026-03-10',
    projectKey: 'project-alpha',
    activityKey: 'activity-dev'
  });

  assert.deepEqual(result.events.map((event) => event.id), ['evt-1']);
  assert.deepEqual(result.dailyDetails[0].artiaEntries.map((entry) => entry.id), ['artia-1']);
  assert.equal(result.meta.filterProjectKey, 'project-alpha');
  assert.equal(result.meta.filterActivityKey, 'activity-dev');
});

test('buildRangeSummaryResponse aggregates by exact activityKey instead of approximate label matches', () => {
  const dayRows = [
    {
      day: '2026-03-10',
      factorial_hours: 8,
      system_hours: 5,
      synced_hours: 5,
      pending_hours: 0,
      manual_hours: 0,
      artia_hours: 5,
      artia_entry_count: 2,
      remote_only_count: 0,
      remote_only_entries_json: [],
      artia_entries_json: [],
      artia_source_available: true,
      artia_source_table: 'organization_time_entries',
      artia_read_reason: null,
      last_computed_at: '2026-03-10T12:00:00.000Z'
    }
  ];

  const activityRows = [
    {
      day: '2026-03-10',
      project_key: 'project-alpha',
      project_id: '1',
      project_number: '1360',
      project_name: 'Projeto Alpha',
      project_label: '1360 - Projeto Alpha',
      activity_key: 'activity-dev',
      activity_id: 'A1',
      activity_label: 'Desenvolvimento',
      system_hours: 2,
      synced_hours: 2,
      pending_hours: 0,
      manual_hours: 0,
      system_event_count: 1,
      artia_hours: 2,
      artia_entry_count: 1,
      remote_only_hours: 0,
      remote_only_entry_count: 0
    },
    {
      day: '2026-03-10',
      project_key: 'project-alpha',
      project_id: '1',
      project_number: '1360',
      project_name: 'Projeto Alpha',
      project_label: '1360 - Projeto Alpha',
      activity_key: 'activity-dev-extended',
      activity_id: 'A10',
      activity_label: 'Desenvolvimento extendido',
      system_hours: 3,
      synced_hours: 3,
      pending_hours: 0,
      manual_hours: 0,
      system_event_count: 1,
      artia_hours: 3,
      artia_entry_count: 1,
      remote_only_hours: 0,
      remote_only_entry_count: 0
    }
  ];

  const result = buildRangeSummaryResponse(dayRows, [], activityRows, {
    startDate: '2026-03-10',
    endDate: '2026-03-10',
    projectKey: 'project-alpha',
    activityKey: 'activity-dev'
  });

  assert.equal(result.dailyDetails[0].systemHours, 2);
  assert.equal(result.stats.totalSystemHours, 2);
  assert.deepEqual(result.activitySummaries.map((summary) => summary.key), ['activity-dev']);
  assert.equal(result.stats.filtersApplied.projectKey, 'project-alpha');
  assert.equal(result.stats.filtersApplied.activityKey, 'activity-dev');
});
