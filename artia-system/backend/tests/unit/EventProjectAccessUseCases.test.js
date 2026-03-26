import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateEventUseCase } from '../../src/application/use-cases/events/CreateEventUseCase.js';
import { UpdateEventUseCase } from '../../src/application/use-cases/events/UpdateEventUseCase.js';
import { MoveEventUseCase } from '../../src/application/use-cases/events/MoveEventUseCase.js';

function buildForbiddenError(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

test('CreateEventUseCase rejeita projeto fora do acesso atual do usuario', async () => {
  const eventRepository = {
    async findByDay() {
      return [];
    },
    async create() {
      throw new Error('nao deveria criar evento');
    }
  };

  const useCase = new CreateEventUseCase(
    eventRepository,
    {
      validateEvent() {
        return true;
      }
    },
    {
      async resolveEventSelection() {
        throw buildForbiddenError('Projeto fora do acesso atual do usuario no Artia.');
      }
    }
  );

  await assert.rejects(
    () => useCase.execute(
      {
        start: '2026-03-20T08:00:00.000Z',
        end: '2026-03-20T09:00:00.000Z',
        day: '2026-03-20',
        project: '1360',
        activity: { label: 'Desenvolvimento' },
        userId: 'user-1'
      },
      {
        id: 'user-1',
        artiaUserId: '244826'
      }
    ),
    /Projeto fora do acesso atual do usuario no Artia\./
  );
});

test('CreateEventUseCase rejeita atividade sem ID resolvido automaticamente', async () => {
  const eventRepository = {
    async findByDay() {
      return [];
    },
    async create() {
      throw new Error('nao deveria criar evento');
    }
  };

  const useCase = new CreateEventUseCase(
    eventRepository,
    {
      validateEvent() {
        return true;
      }
    },
    {
      async resolveEventSelection() {
        throw new Error('Atividade sem ID Artia resolvido automaticamente.');
      }
    }
  );

  await assert.rejects(
    () => useCase.execute(
      {
        start: '2026-03-20T08:00:00.000Z',
        end: '2026-03-20T09:00:00.000Z',
        day: '2026-03-20',
        project: '1360',
        activity: { label: 'Desenvolvimento' },
        userId: 'user-1'
      },
      {
        id: 'user-1',
        artiaUserId: '244826'
      }
    ),
    /Atividade sem ID Artia resolvido automaticamente\./
  );
});

test('CreateEventUseCase persiste os campos gerados pela edicao inline e recomputa o dia tocado', async () => {
  let createdEvent = null;
  const recomputeCalls = [];
  const eventRepository = {
    async findByDay() {
      return [];
    },
    async create(event) {
      createdEvent = event;
      return event;
    }
  };

  const useCase = new CreateEventUseCase(
    eventRepository,
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
    {
      async recomputeDaysForUser(userId, days) {
        recomputeCalls.push({ userId, days });
      }
    }
  );

  const result = await useCase.execute(
    {
      start: '2026-03-26T11:00:00.000Z',
      end: '2026-03-26T11:50:00.000Z',
      day: '2026-03-26',
      project: '1360',
      activity: { id: 'A1', label: 'Desenvolvimento' },
      notes: 'Ajuste inline',
      artiaLaunched: true,
      workplace: 'Casa',
      userId: 'user-1'
    },
    {
      id: 'user-1',
      artiaUserId: '244826'
    }
  );

  assert.deepEqual(createdEvent.toJSON(), {
    id: createdEvent.id,
    userId: 'user-1',
    start: '2026-03-26T11:00:00.000Z',
    end: '2026-03-26T11:50:00.000Z',
    day: '2026-03-26',
    project: '1360',
    activityId: 'A1',
    activityLabel: 'Desenvolvimento',
    notes: 'Ajuste inline',
    artiaLaunched: true,
    workplace: 'Casa',
    createdAt: createdEvent.createdAt.toISOString(),
    updatedAt: createdEvent.updatedAt.toISOString()
  });
  assert.deepEqual(result, createdEvent.toJSON());
  assert.deepEqual(recomputeCalls, [
    {
      userId: 'user-1',
      days: ['2026-03-26']
    }
  ]);
});

test('UpdateEventUseCase bloqueia edicao de evento historico sem acesso atual', async () => {
  let updateCalled = false;
  const eventRepository = {
    async findById() {
      return {
        id: 'evt-1',
        project: '1360',
        activity: {
          label: 'Desenvolvimento'
        },
        timeRange: {
          day: '2026-03-20'
        }
      };
    },
    async findByDay() {
      return [];
    },
    async update() {
      updateCalled = true;
      return null;
    }
  };

  const useCase = new UpdateEventUseCase(
    eventRepository,
    {
      validateEvent() {
        return true;
      }
    },
    {
      async ensureEventProjectAccessible() {
        throw buildForbiddenError('Projeto fora do acesso atual do usuario no Artia.');
      }
    }
  );

  await assert.rejects(
    () => useCase.execute(
      'evt-1',
      {
        notes: 'tentativa de edicao'
      },
      {
        id: 'user-1',
        artiaUserId: '244826'
      }
    ),
    /Projeto fora do acesso atual do usuario no Artia\./
  );

  assert.equal(updateCalled, false);
});

test('UpdateEventUseCase persiste status e observacao vindos da edicao inline', async () => {
  let updatedEvent = null;
  const recomputeCalls = [];
  const eventRepository = {
    async findById() {
      return {
        id: 'evt-1',
        project: '1360',
        activity: {
          id: 'A1',
          label: 'Desenvolvimento'
        },
        notes: 'Antes',
        artiaLaunched: true,
        workplace: 'Casa',
        timeRange: {
          day: '2026-03-26'
        },
        updateNotes(notes) {
          this.notes = notes;
        },
        toggleArtiaLaunched() {
          this.artiaLaunched = !this.artiaLaunched;
        },
        setWorkplace(workplace) {
          this.workplace = workplace;
        },
        toJSON() {
          return {
            id: this.id,
            project: this.project,
            activityId: this.activity.id,
            activityLabel: this.activity.label,
            notes: this.notes,
            artiaLaunched: this.artiaLaunched,
            workplace: this.workplace,
            day: this.timeRange.day
          };
        }
      };
    },
    async findByDay() {
      return [];
    },
    async update(id, event) {
      updatedEvent = { id, snapshot: event.toJSON() };
      return {
        toJSON() {
          return event.toJSON();
        }
      };
    }
  };

  const useCase = new UpdateEventUseCase(
    eventRepository,
    {
      validateEvent() {
        return true;
      }
    },
    {
      async ensureEventProjectAccessible() {
        return true;
      },
      async resolveEventSelection() {
        throw new Error('nao deveria resolver atividade');
      }
    },
    {
      async recomputeDaysForUser(userId, days) {
        recomputeCalls.push({ userId, days });
      }
    }
  );

  const result = await useCase.execute(
    'evt-1',
    {
      notes: 'Depois',
      artiaLaunched: false,
      workplace: null
    },
    {
      id: 'user-1',
      artiaUserId: '244826'
    }
  );

  assert.deepEqual(updatedEvent, {
    id: 'evt-1',
    snapshot: {
      id: 'evt-1',
      project: '1360',
      activityId: 'A1',
      activityLabel: 'Desenvolvimento',
      notes: 'Depois',
      artiaLaunched: false,
      workplace: null,
      day: '2026-03-26'
    }
  });
  assert.deepEqual(result, updatedEvent.snapshot);
  assert.deepEqual(recomputeCalls, [
    {
      userId: 'user-1',
      days: ['2026-03-26', '2026-03-26']
    }
  ]);
});

test('MoveEventUseCase bloqueia mover evento sem acesso atual ao projeto', async () => {
  let updateCalled = false;
  const eventRepository = {
    async findById() {
      return {
        id: 'evt-1',
        project: '1360'
      };
    },
    async findByDay() {
      return [];
    },
    async update() {
      updateCalled = true;
      return null;
    }
  };

  const useCase = new MoveEventUseCase(
    eventRepository,
    {
      validateEvent() {
        return true;
      }
    },
    {
      async ensureEventProjectAccessible() {
        throw buildForbiddenError('Projeto fora do acesso atual do usuario no Artia.');
      }
    }
  );

  await assert.rejects(
    () => useCase.execute(
      'evt-1',
      '2026-03-20T10:00:00.000Z',
      '2026-03-20T11:00:00.000Z',
      '2026-03-20',
      {
        id: 'user-1',
        artiaUserId: '244826'
      }
    ),
    /Projeto fora do acesso atual do usuario no Artia\./
  );

  assert.equal(updateCalled, false);
});
