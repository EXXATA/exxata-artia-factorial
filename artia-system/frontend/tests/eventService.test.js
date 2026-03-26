import test from 'node:test';
import assert from 'node:assert/strict';
import apiClient from '../src/services/api/client.js';
import { eventService } from '../src/services/api/eventService.js';

test('eventService envia create e update para os endpoints esperados', async () => {
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;
  const calls = [];

  apiClient.post = async (url, body) => {
    calls.push({ method: 'post', url, body });
    return { data: { success: true } };
  };
  apiClient.put = async (url, body) => {
    calls.push({ method: 'put', url, body });
    return { data: { success: true } };
  };

  try {
    const payload = {
      day: '2026-03-26',
      start: '2026-03-26T11:00:00.000Z',
      end: '2026-03-26T11:50:00.000Z',
      project: '1360',
      activity: { id: 'A1', label: 'Desenvolvimento' }
    };

    await eventService.create(payload);
    await eventService.update('evt-1', { notes: 'Atualizado' });

    assert.deepEqual(calls, [
      { method: 'post', url: '/events', body: payload },
      { method: 'put', url: '/events/evt-1', body: { notes: 'Atualizado' } }
    ]);
  } finally {
    apiClient.post = originalPost;
    apiClient.put = originalPut;
  }
});

test('eventService monta os requests de importacao com payloads corretos', async () => {
  const originalPost = apiClient.post;
  const calls = [];

  apiClient.post = async (url, body, config) => {
    calls.push({ url, body, config });
    return { data: { success: true } };
  };

  try {
    const file = new File(['conteudo'], 'planilha.csv', { type: 'text/csv' });

    await eventService.importLegacy(file, 'replace');
    await eventService.analyzeImport(file, { project: 'Projeto' });
    await eventService.applyImport([{ day: '2026-03-26' }]);

    assert.equal(calls[0].url, '/events/import');
    assert.equal(calls[0].body.get('file').name, 'planilha.csv');
    assert.equal(calls[0].body.get('mode'), 'replace');
    assert.equal(calls[0].config.headers['Content-Type'], 'multipart/form-data');

    assert.equal(calls[1].url, '/events/import/analyze');
    assert.equal(calls[1].body.get('file').name, 'planilha.csv');
    assert.equal(calls[1].body.get('mapping'), JSON.stringify({ project: 'Projeto' }));
    assert.equal(calls[1].config.headers['Content-Type'], 'multipart/form-data');

    assert.deepEqual(calls[2], {
      url: '/events/import/apply',
      body: { rows: [{ day: '2026-03-26' }] },
      config: undefined
    });
  } finally {
    apiClient.post = originalPost;
  }
});
