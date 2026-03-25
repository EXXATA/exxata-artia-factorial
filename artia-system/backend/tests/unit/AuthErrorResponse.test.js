import assert from 'node:assert/strict';
import test from 'node:test';
import { toAuthErrorPayload } from '../../src/presentation/http/middlewares/authErrorResponse.js';

test('toAuthErrorPayload serializa code e data quando presentes', () => {
  const payload = toAuthErrorPayload({
    message: 'Acesso pendente de provisionamento.',
    code: 'AUTH_PROVISIONING_PENDING',
    data: {
      missing: ['factorial_employee_id'],
      canRetry: true
    }
  });

  assert.deepEqual(payload, {
    success: false,
    message: 'Acesso pendente de provisionamento.',
    code: 'AUTH_PROVISIONING_PENDING',
    data: {
      missing: ['factorial_employee_id'],
      canRetry: true
    }
  });
});

test('toAuthErrorPayload omite data quando indefinido', () => {
  const payload = toAuthErrorPayload({
    message: 'Sessao invalida ou expirada.',
    code: 'AUTH_INVALID_SESSION'
  });

  assert.deepEqual(payload, {
    success: false,
    message: 'Sessao invalida ou expirada.',
    code: 'AUTH_INVALID_SESSION'
  });
});
