import test from 'node:test';
import assert from 'node:assert/strict';
import { ArtiaProjectAccessService } from '../../src/infrastructure/external/ArtiaProjectAccessService.js';

test('ArtiaProjectAccessService prioriza id e participantes em tabelas de projetos', () => {
  const service = new ArtiaProjectAccessService();

  const source = service.buildSourceFromColumns('organization_9115_projects', [
    'id',
    'folder_id',
    'user_id',
    'responsible_email',
    'group_participants',
    'status'
  ]);

  assert.equal(source.projectIdColumn, 'id');
  assert.equal(source.participantListColumn, 'group_participants');
  assert.equal(source.applyActiveFilter, false);
});

test('ArtiaProjectAccessService inclui nome do participante na consulta de acesso', () => {
  const service = new ArtiaProjectAccessService();

  const query = service.buildAccessQuery(
    {
      tableName: 'organization_9115_projects',
      userIdColumn: 'user_id',
      userEmailColumn: 'responsible_email',
      participantListColumn: 'group_participants',
      projectIdColumn: 'id',
      activeColumn: 'status',
      applyActiveFilter: false
    },
    {
      artiaUserId: '244826',
      email: 'andre.baptista@exxata.com.br',
      name: 'André Rettore Baptista'
    }
  );

  assert.match(query.sql, /group_participants/);
  assert.deepEqual(query.params, [
    '244826',
    'andre.baptista@exxata.com.br',
    '%André Rettore Baptista%'
  ]);
});

