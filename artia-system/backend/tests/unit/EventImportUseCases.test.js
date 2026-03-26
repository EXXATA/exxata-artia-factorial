import test from 'node:test';
import assert from 'node:assert/strict';
import { ApplyEventImportUseCase } from '../../src/application/use-cases/events/ApplyEventImportUseCase.js';

function buildUser() {
  return {
    id: 'user-1',
    email: 'user@example.com',
    artiaUserId: 'artia-1'
  };
}

function buildPreviewRow(overrides = {}) {
  return {
    rowId: 'row-1',
    rowNumber: 2,
    status: 'valid',
    issues: [],
    normalized: {
      day: '2026-03-25',
      start: '2026-03-25T08:00:00.000Z',
      end: '2026-03-25T09:00:00.000Z',
      project: '1360',
      activity: {
        id: 'A1',
        label: 'Desenvolvimento'
      },
      notes: 'Linha válida',
      artiaLaunched: false,
      workplace: null
    },
    ...overrides
  };
}

test('ApplyEventImportUseCase blocks apply when any row is critical', async () => {
  const useCase = new ApplyEventImportUseCase(
    {
      async findByDateRange() {
        return [];
      },
      async bulkCreate() {
        throw new Error('nao deveria persistir');
      }
    },
    {
      validateEvent() {
        return true;
      }
    },
    {
      async resolveEventSelection() {
        return {
          project: { number: '1360' },
          activity: { id: 'A1', label: 'Desenvolvimento' }
        };
      }
    },
    null
  );

  await assert.rejects(
    () => useCase.execute({
      rows: [
        buildPreviewRow({
          status: 'critical',
          issues: [{ severity: 'critical', code: 'TIME_CONFLICT' }]
        })
      ],
      user: buildUser()
    }),
    /críticas/i
  );
});

test('ApplyEventImportUseCase persists only valid rows, skips warnings and recomputes touched days', async () => {
  const bulkCreateCalls = [];
  const recomputeCalls = [];
  const useCase = new ApplyEventImportUseCase(
    {
      async findByDateRange() {
        return [];
      },
      async bulkCreate(events) {
        bulkCreateCalls.push(events);
        return events;
      }
    },
    {
      validateEvent() {
        return true;
      }
    },
    {
      async resolveEventSelection(user, payload) {
        return {
          project: { number: payload.project },
          activity: {
            id: payload.activity?.id || 'A1',
            label: payload.activity?.label || 'Desenvolvimento'
          }
        };
      }
    },
    {
      async recomputeDaysForUser(userId, days) {
        recomputeCalls.push({ userId, days });
      }
    }
  );

  const result = await useCase.execute({
    rows: [
      buildPreviewRow(),
      buildPreviewRow({
        rowId: 'row-2',
        rowNumber: 3,
        status: 'warning',
        issues: [{ severity: 'warning', code: 'DUPLICATE_EVENT' }],
        normalized: {
          day: '2026-03-25',
          start: '2026-03-25T10:00:00.000Z',
          end: '2026-03-25T11:00:00.000Z',
          project: '1360',
          activity: {
            id: 'A1',
            label: 'Desenvolvimento'
          },
          notes: 'Duplicada',
          artiaLaunched: false,
          workplace: null
        }
      })
    ],
    user: buildUser()
  });

  assert.equal(bulkCreateCalls.length, 1);
  assert.equal(bulkCreateCalls[0].length, 1);
  assert.deepEqual(bulkCreateCalls[0][0].toJSON(), {
    id: bulkCreateCalls[0][0].id,
    userId: 'user-1',
    start: '2026-03-25T08:00:00.000Z',
    end: '2026-03-25T09:00:00.000Z',
    day: '2026-03-25',
    project: '1360',
    activityId: 'A1',
    activityLabel: 'Desenvolvimento',
    notes: 'Linha válida',
    artiaLaunched: false,
    workplace: null,
    createdAt: bulkCreateCalls[0][0].createdAt.toISOString(),
    updatedAt: bulkCreateCalls[0][0].updatedAt.toISOString()
  });
  assert.equal(result.imported, 1);
  assert.equal(result.skippedWarnings, 1);
  assert.deepEqual(result.affectedDays, ['2026-03-25']);
  assert.deepEqual(recomputeCalls, [
    {
      userId: 'user-1',
      days: ['2026-03-25']
    }
  ]);
});
