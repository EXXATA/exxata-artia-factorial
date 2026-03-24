import assert from 'node:assert/strict';
import test from 'node:test';
import { CorporateMicrosoftIdentityPolicy } from '../../src/domain/services/CorporateMicrosoftIdentityPolicy.js';
import { ResolveAuthenticatedUserUseCase } from '../../src/application/use-cases/auth/ResolveAuthenticatedUserUseCase.js';

function buildPolicy() {
  return new CorporateMicrosoftIdentityPolicy({
    allowedDomain: 'exxata.com.br'
  });
}

function buildAuthUser(overrides = {}) {
  return {
    id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
    email: 'andre.baptista@exxata.com.br',
    app_metadata: {
      provider: 'azure',
      providers: ['azure']
    },
    identities: [
      {
        provider: 'azure',
        identity_data: {
          email: 'andre.baptista@exxata.com.br'
        }
      }
    ],
    user_metadata: {
      full_name: 'Andre Rettore Baptista'
    },
    ...overrides
  };
}

test('ResolveAuthenticatedUserUseCase sincroniza perfil local preservando ids externos', async () => {
  const currentProfile = {
    id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
    email: 'andre.baptista@exxata.com.br',
    name: 'Andre Baptista',
    factorialEmployeeId: '1370321',
    artiaUserId: '244826'
  };

  const userRepository = {
    async findById(id) {
      assert.equal(id, currentProfile.id);
      return currentProfile;
    },
    async ensureProfile(payload) {
      assert.equal(payload.id, currentProfile.id);
      assert.equal(payload.email, currentProfile.email);
      assert.equal(payload.factorialEmployeeId, currentProfile.factorialEmployeeId);
      assert.equal(payload.artiaUserId, currentProfile.artiaUserId);
      assert.equal(payload.name, 'Andre Rettore Baptista');
      return payload;
    }
  };

  const useCase = new ResolveAuthenticatedUserUseCase(userRepository, buildPolicy());
  const result = await useCase.execute(buildAuthUser());

  assert.equal(result.factorialEmployeeId, currentProfile.factorialEmployeeId);
  assert.equal(result.artiaUserId, currentProfile.artiaUserId);
});

test('ResolveAuthenticatedUserUseCase bloqueia usuario nao reconciliado por email', async () => {
  const userRepository = {
    async findById() {
      return null;
    },
    async findByEmail(email) {
      assert.equal(email, 'andre.baptista@exxata.com.br');
      return {
        id: 'legacy-profile-id',
        email,
        name: 'Andre Baptista'
      };
    }
  };

  const useCase = new ResolveAuthenticatedUserUseCase(userRepository, buildPolicy());

  await assert.rejects(
    () => useCase.execute(buildAuthUser()),
    (error) => error.code === 'USER_PROFILE_RECONCILIATION_REQUIRED'
  );
});

test('ResolveAuthenticatedUserUseCase bloqueia usuario sem perfil provisionado', async () => {
  const userRepository = {
    async findById() {
      return null;
    },
    async findByEmail() {
      return null;
    }
  };

  const useCase = new ResolveAuthenticatedUserUseCase(userRepository, buildPolicy());

  await assert.rejects(
    () => useCase.execute(buildAuthUser()),
    (error) => error.code === 'USER_PROFILE_NOT_PROVISIONED'
  );
});

test('ResolveAuthenticatedUserUseCase converte falha de repositorio em erro de infraestrutura', async () => {
  const userRepository = {
    async findById() {
      throw new Error('fetch failed');
    }
  };

  const useCase = new ResolveAuthenticatedUserUseCase(userRepository, buildPolicy());

  await assert.rejects(
    () => useCase.execute(buildAuthUser()),
    (error) => error.code === 'AUTH_PROFILE_STORE_UNAVAILABLE'
  );
});
