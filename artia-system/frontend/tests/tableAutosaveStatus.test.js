import test from 'node:test';
import assert from 'node:assert/strict';
import { getAutosaveStatusPresentation } from '../src/components/table/tableAutosaveStatus.js';

test('getAutosaveStatusPresentation prioriza o estado salvando', () => {
  const presentation = getAutosaveStatusPresentation({
    isSaving: true,
    lastSavedAt: '2026-03-26T15:10:00.000Z',
    lastErrorMessage: null
  });

  assert.deepEqual(presentation, {
    tone: 'saving',
    label: 'Salvando automaticamente...'
  });
});

test('getAutosaveStatusPresentation mostra o ultimo salvamento quando a fila esta vazia', () => {
  const presentation = getAutosaveStatusPresentation({
    isSaving: false,
    lastSavedAt: '2026-03-26T15:10:00.000Z',
    lastErrorMessage: null
  });

  assert.equal(presentation.tone, 'saved');
  assert.match(presentation.label, /Salvo automaticamente as/);
});

test('getAutosaveStatusPresentation exibe um aviso sutil de erro apos rollback', () => {
  const presentation = getAutosaveStatusPresentation({
    isSaving: false,
    lastSavedAt: '2026-03-26T15:10:00.000Z',
    lastErrorMessage: 'Atividade fora do projeto selecionado ou indisponivel no Artia'
  });

  assert.equal(presentation.tone, 'error');
  assert.match(presentation.label, /Atividade fora do projeto selecionado ou indisponivel no Artia/);
  assert.match(presentation.label, /Ultimo salvo as/);
});
