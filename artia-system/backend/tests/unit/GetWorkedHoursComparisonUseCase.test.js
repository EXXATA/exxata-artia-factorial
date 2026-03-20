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

test('GetWorkedHoursComparisonUseCase limita o escopo aos projetos acessiveis do usuario', async () => {
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
          end: '2026-03-05T10:00:00.000Z',
          project: '1360'
        }),
        buildEvent({
          id: 'evt-2',
          day: '2026-03-05',
          start: '2026-03-05T10:00:00.000Z',
          end: '2026-03-05T12:00:00.000Z',
          project: '9999'
        })
      ];
    },
    async findAll() {
      return [];
    }
  };

  const integrationReadModelService = {
    async getProjectCatalog() {
      return [
        { id: '1', number: '1360', name: 'Projeto acessivel' },
        { id: '2', number: '9999', name: 'Projeto externo' }
      ];
    },
    async getFactorialDailyHours() {
      return {
        '2026-03-05': 8
      };
    },
    async getArtiaSnapshots() {
      return {
        entries: [
          {
            id: 'artia-1',
            date: '2026-03-05',
            start: '2026-03-05T08:00:00.000Z',
            end: '2026-03-05T10:00:00.000Z',
            minutes: 120,
            hours: 2,
            project: '1360 - Projeto acessivel',
            projectId: '1',
            activity: 'Atividade'
          },
          {
            id: 'artia-2',
            date: '2026-03-05',
            start: '2026-03-05T10:00:00.000Z',
            end: '2026-03-05T12:00:00.000Z',
            minutes: 120,
            hours: 2,
            project: '9999 - Projeto externo',
            projectId: '2',
            activity: 'Atividade externa'
          }
        ],
        dailyHoursByDay: {
          '2026-03-05': { workedHours: 4, entryCount: 2 }
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
    integrationReadModelService,
    {
      async getAccessibleProjectCatalog() {
        return [
          { id: '1', number: '1360', name: 'Projeto acessivel' }
        ];
      }
    }
  );

  const result = await useCase.execute('user-1', {
    startDate: '2026-03-05',
    endDate: '2026-03-05'
  });

  assert.equal(result.projectSummaries.length, 1);
  assert.equal(result.projectSummaries[0].projectNumber, '1360');
  assert.equal(result.dailyDetails[0].systemEvents.length, 1);
  assert.equal(result.dailyDetails[0].artiaEntries.length, 1);
  assert.equal(result.stats.projectCount, 1);
});
