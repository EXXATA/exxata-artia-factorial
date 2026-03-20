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

test('GetWorkedHoursComparisonUseCase resolve fim remoto e evita duplicar o label do projeto', async () => {
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
      return [];
    },
    async findAll() {
      return [];
    }
  };

  const integrationReadModelService = {
    async getProjectCatalog() {
      return [
        { id: '6207936', number: '1358', name: '1358 - CONCREJATO x RIO+ SANEAMENTO' },
        { id: '159219', number: 'SEM-NUMERO-159219', name: '0000 - Gerenciamento' }
      ];
    },
    async getFactorialDailyHours() {
      return {
        '2026-03-09': 8
      };
    },
    async getArtiaSnapshots() {
      return {
        entries: [
          {
            id: 'artia-1',
            date: '2026-03-09',
            start: '2026-03-09T16:40:00.000Z',
            end: null,
            minutes: 90,
            hours: 1.5,
            project: '1358 - CONCREJATO x RIO+ SANEAMENTO',
            projectId: '6207936',
            activity: '6.6 - Redacao de Carta a Pedido do Cliente',
            activityId: '31535373',
            notes: 'Carta resposta'
          },
          {
            id: 'artia-2',
            date: '2026-03-09',
            start: '2026-03-09T19:10:00.000Z',
            end: null,
            minutes: 50,
            hours: 0.83,
            project: '0000 - Gerenciamento',
            projectId: '159219',
            activity: '107 - Outros',
            activityId: '30041338',
            notes: 'Alinhamento'
          }
        ],
        dailyHoursByDay: {
          '2026-03-09': { workedHours: 2.33, entryCount: 2 }
        },
        source: { tableName: 'organization_9115_time_entries' },
        reason: null
      };
    },
    async decorateEventsWithSyncStatus(events) {
      return events;
    }
  };

  const useCase = new GetWorkedHoursComparisonUseCase(
    eventRepository,
    userRepository,
    integrationReadModelService,
    {
      async getAccessibleProjectCatalog() {
        return [
          { id: '6207936', number: '1358', name: '1358 - CONCREJATO x RIO+ SANEAMENTO' },
          { id: '159219', number: 'SEM-NUMERO-159219', name: '0000 - Gerenciamento' }
        ];
      }
    }
  );

  const result = await useCase.execute('user-1', {
    startDate: '2026-03-09',
    endDate: '2026-03-09'
  });

  const [firstEntry, secondEntry] = result.dailyDetails[0].remoteOnlyArtiaEntries;

  assert.equal(firstEntry.end, '2026-03-09T18:10:00.000Z');
  assert.equal(firstEntry.endEstimated, true);
  assert.equal(firstEntry.projectDisplayLabel, '1358 - CONCREJATO x RIO+ SANEAMENTO');

  assert.equal(secondEntry.end, '2026-03-09T20:00:00.000Z');
  assert.equal(secondEntry.endEstimated, true);
  assert.equal(secondEntry.projectDisplayLabel, '0000 - Gerenciamento');
});
