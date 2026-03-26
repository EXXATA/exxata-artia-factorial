import test from 'node:test';
import assert from 'node:assert/strict';
import { EventImportEngine } from '../../src/application/services/EventImportEngine.js';

function buildProjectCatalog() {
  return [
    {
      id: 'project-1',
      number: '1360',
      name: 'Projeto Alpha',
      activities: [
        {
          id: 'activity-1',
          artiaId: 'A1',
          label: 'Desenvolvimento'
        }
      ]
    }
  ];
}

function toLocalIso(day, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(`${day}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

test('EventImportEngine suggests mappings for exported CSV headers and normalizes valid rows', async () => {
  const engine = new EventImportEngine();
  const csv = [
    'Data;Projeto;Hora Início;Hora de Término;Atividade;Observação;Artia;ID da Atividade',
    '25/03/2026;1360;08:00;09:30;Desenvolvimento;Primeira linha;Sim;A1'
  ].join('\n');

  const result = await engine.analyze({
    buffer: Buffer.from(csv, 'utf-8'),
    fileName: 'apontamento.csv',
    accessibleProjects: buildProjectCatalog(),
    existingEvents: []
  });

  assert.equal(result.detectedColumns.length, 8);
  assert.equal(result.suggestedMapping.date.columnName, 'Data');
  assert.equal(result.suggestedMapping.startTime.columnName, 'Hora Início');
  assert.equal(result.suggestedMapping.endTime.columnName, 'Hora de Término');
  assert.equal(result.suggestedMapping.project.columnName, 'Projeto');
  assert.equal(result.suggestedMapping.activity.columnName, 'Atividade');
  assert.equal(result.summary.totalRows, 1);
  assert.equal(result.summary.validRows, 1);
  assert.equal(result.previewRows[0].status, 'valid');
  assert.equal(result.previewRows[0].normalized.project, '1360');
  assert.equal(result.previewRows[0].normalized.activity.id, 'A1');
  assert.equal(result.previewRows[0].normalized.activity.label, 'Desenvolvimento');
  assert.equal(result.previewRows[0].normalized.artiaLaunched, true);
});

test('EventImportEngine marks exact duplicates as warnings and overlaps as critical', async () => {
  const engine = new EventImportEngine();
  const csv = [
    'Data;Projeto;Hora Início;Hora de Término;Atividade;Observação;Artia;ID da Atividade',
    '25/03/2026;1360;08:00;09:00;Desenvolvimento;Duplicado;Sim;A1',
    '25/03/2026;1360;08:30;09:30;Desenvolvimento;Conflito;Não;A1'
  ].join('\n');

  const existingEvents = [
    {
      id: 'evt-1',
      day: '2026-03-25',
      start: toLocalIso('2026-03-25', '08:00'),
      end: toLocalIso('2026-03-25', '09:00'),
      project: '1360',
      activityId: 'A1',
      activityLabel: 'Desenvolvimento',
      notes: 'Duplicado',
      artiaLaunched: true
    }
  ];

  const result = await engine.analyze({
    buffer: Buffer.from(csv, 'utf-8'),
    fileName: 'apontamento.csv',
    accessibleProjects: buildProjectCatalog(),
    existingEvents
  });

  assert.equal(result.summary.warningRows, 1);
  assert.equal(result.summary.criticalRows, 1);
  assert.equal(result.previewRows[0].status, 'warning');
  assert.equal(result.previewRows[0].issues[0].code, 'DUPLICATE_EVENT');
  assert.equal(result.previewRows[1].status, 'critical');
  assert.equal(result.previewRows[1].issues[0].code, 'TIME_CONFLICT');
});
