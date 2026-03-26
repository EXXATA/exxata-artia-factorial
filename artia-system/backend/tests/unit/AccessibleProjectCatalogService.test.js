import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessibleProjectCatalogService } from '../../src/application/services/AccessibleProjectCatalogService.js';

function buildCatalog() {
  return [
    {
      id: '10',
      number: '1360',
      name: 'Projeto Alpha',
      activities: [
        {
          id: '501',
          artiaId: '9001',
          label: 'Desenvolvimento'
        },
        {
          id: null,
          artiaId: null,
          label: 'Sem ID'
        }
      ]
    },
    {
      id: '20',
      number: '2500',
      name: 'Projeto Beta',
      activities: [
        {
          id: '601',
          artiaId: '9100',
          label: 'Analise'
        }
      ]
    }
  ];
}

test('AccessibleProjectCatalogService retorna apenas projetos acessiveis do usuario', async () => {
  const service = new AccessibleProjectCatalogService(
    {
      async getProjectCatalog() {
        return buildCatalog();
      }
    },
    {
      async getAccessibleProjectIdsForUser(user) {
        assert.equal(user.id, 'user-1');
        return {
          projectIds: ['10']
        };
      }
    }
  );

  const projects = await service.getAccessibleProjectCatalog({ id: 'user-1' });

  assert.deepEqual(projects.map((project) => project.number), ['1360']);
});

test('AccessibleProjectCatalogService falha fechado quando nao encontra acesso explicito', async () => {
  const service = new AccessibleProjectCatalogService(
    {
      async getProjectCatalog() {
        return buildCatalog();
      }
    },
    {
      async getAccessibleProjectIdsForUser() {
        return {
          projectIds: [],
          reason: 'project_access_source_not_found'
        };
      }
    }
  );

  const projects = await service.getAccessibleProjectCatalog({ id: 'user-1' });

  assert.deepEqual(projects, []);
});

test('AccessibleProjectCatalogService resolve projeto e atividade canonicos', async () => {
  const service = new AccessibleProjectCatalogService(
    {
      async getProjectCatalog() {
        return buildCatalog();
      }
    },
    {
      async getAccessibleProjectIdsForUser() {
        return {
          projectIds: ['10']
        };
      }
    }
  );

  const selection = await service.resolveEventSelection(
    { id: 'user-1' },
    {
      project: '1360 - Projeto Alpha',
      activityLabel: 'desenvolvimento'
    }
  );

  assert.equal(selection.project.number, '1360');
  assert.deepEqual(selection.activity, {
    id: '9001',
    label: 'Desenvolvimento'
  });
});

test('AccessibleProjectCatalogService rejeita atividade sem ID Artia automatico', async () => {
  const service = new AccessibleProjectCatalogService(
    {
      async getProjectCatalog() {
        return buildCatalog();
      }
    },
    {
      async getAccessibleProjectIdsForUser() {
        return {
          projectIds: ['10']
        };
      }
    }
  );

  await assert.rejects(
    () => service.resolveEventSelection(
      { id: 'user-1' },
      {
        project: '1360',
        activityLabel: 'Sem ID'
      }
    ),
    /Atividade sem ID Artia resolvido automaticamente\./
  );
});

test('AccessibleProjectCatalogService preserva a mensagem quando a atividade nao pertence ao projeto acessivel', async () => {
  const service = new AccessibleProjectCatalogService(
    {
      async getProjectCatalog() {
        return buildCatalog();
      }
    },
    {
      async getAccessibleProjectIdsForUser() {
        return {
          projectIds: ['10']
        };
      }
    }
  );

  await assert.rejects(
    () => service.resolveEventSelection(
      { id: 'user-1' },
      {
        project: '1360',
        activityLabel: 'Analise'
      }
    ),
    /Atividade fora do projeto selecionado ou indisponivel no Artia\./
  );
});

test('AccessibleProjectCatalogService expone project keys e activity keys canonicos para o front', async () => {
  const service = new AccessibleProjectCatalogService(
    {
      async getProjectCatalog() {
        return buildCatalog();
      }
    },
    {
      async getAccessibleProjectIdsForUser() {
        return {
          projectIds: ['10']
        };
      }
    }
  );

  const projects = await service.getAccessibleProjectCatalog({ id: 'user-1' });

  assert.equal(projects[0].key, '10');
  assert.equal(projects[0].activities[0].key, '9001');
  assert.equal(projects[0].activities[1].key, '10::sem id');
});
