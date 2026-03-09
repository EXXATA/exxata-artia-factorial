import test from 'node:test';
import assert from 'node:assert/strict';
import { GetWorkedHoursComparisonUseCase } from '../../src/application/use-cases/hours/GetWorkedHoursComparisonUseCase.js';

function buildEvent({ id, day, start, end, project = '1360', activityId = '1', activityLabel = 'Atividade' }) {
  return {
    toJSON() {
      return {
        id,
        day,
        start,
        end,
        project,
        activityId,
        activityLabel,
        artiaLaunched: false
      };
    }
  };
}

test('GetWorkedHoursComparisonUseCase ordena as comparações por data decrescente', async () => {
  const userRepository = {
    async findById() {
      return {
        id: 'user-1',
        email: 'andre.baptista@exxata.com.br',
        factorialEmployeeId: '1370321',
        artiaUserId: '244826'
      };
    }
  };

  const eventRepository = {
    async findByDateRange() {
      return [
        buildEvent({
          id: 'evt-1',
          day: '2026-03-05',
          start: '2026-03-05T08:00:00.000Z',
          end: '2026-03-05T12:00:00.000Z'
        }),
        buildEvent({
          id: 'evt-2',
          day: '2026-03-07',
          start: '2026-03-07T09:00:00.000Z',
          end: '2026-03-07T11:00:00.000Z'
        })
      ];
    },
    async findAll() {
      return [];
    }
  };

  const integrationReadModelService = {
    async getProjectCatalog() {
      return [];
    },
    async getFactorialDailyHours() {
      return {
        '2026-03-06': 8,
        '2026-03-07': 8,
        '2026-03-05': 8
      };
    },
    async getArtiaSnapshots() {
      return {
        dailyHoursByDay: {
          '2026-03-06': { workedHours: 8, entryCount: 1 },
          '2026-03-07': { workedHours: 2, entryCount: 1 },
          '2026-03-05': { workedHours: 4, entryCount: 1 }
        },
        source: { tableName: 'organization_9115_time_entries_v2' },
        reason: null
      };
    },
    async decorateEventsWithSyncStatus(events) {
      return events.map((event) => ({
        ...event,
        artiaSyncStatus: 'pending'
      }));
    }
  };

  const useCase = new GetWorkedHoursComparisonUseCase(
    eventRepository,
    userRepository,
    integrationReadModelService
  );

  const result = await useCase.execute('user-1', {
    startDate: '2026-03-05',
    endDate: '2026-03-07'
  });

  assert.deepEqual(
    result.comparisons.map((item) => item.date),
    ['2026-03-07', '2026-03-06', '2026-03-05']
  );
});
