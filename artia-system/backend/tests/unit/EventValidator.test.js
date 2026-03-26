import test from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import { eventValidator } from '../../src/presentation/http/validators/eventValidator.js';

async function runValidations(validations, body) {
  const req = { body };

  for (const validation of validations) {
    await validation.run(req);
  }

  return validationResult(req);
}

test('eventValidator.update aceita workplace nulo em atualizacao inline de status', async () => {
  const result = await runValidations(eventValidator.update, {
    artiaLaunched: false,
    workplace: null
  });

  assert.equal(result.isEmpty(), true);
});

test('eventValidator.create aceita workplace nulo em criacao inline', async () => {
  const result = await runValidations(eventValidator.create, {
    start: '2026-03-26T08:00:00.000Z',
    end: '2026-03-26T08:50:00.000Z',
    day: '2026-03-26',
    project: '1360',
    activity: {
      label: 'Desenvolvimento'
    },
    workplace: null
  });

  assert.equal(result.isEmpty(), true);
});
