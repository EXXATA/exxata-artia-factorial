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
