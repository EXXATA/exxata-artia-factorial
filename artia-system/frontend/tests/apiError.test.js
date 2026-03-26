import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiErrorMessage } from '../src/services/api/apiError.js';

test('getApiErrorMessage includes validation details when the API returns field errors', () => {
  const error = {
    response: {
      data: {
        message: 'Validation failed',
        errors: [
          { msg: 'Workplace must be a string' },
          { msg: 'Activity label is required' },
          { msg: 'Workplace must be a string' }
        ]
      }
    }
  };

  assert.equal(
    getApiErrorMessage(error, 'Erro ao criar evento'),
    'Validation failed: Workplace must be a string; Activity label is required'
  );
});

test('getApiErrorMessage falls back gracefully when there are no field errors', () => {
  assert.equal(
    getApiErrorMessage({ message: 'Falha local' }, 'Erro generico'),
    'Falha local'
  );
  assert.equal(
    getApiErrorMessage(null, 'Erro generico'),
    'Erro generico'
  );
});
