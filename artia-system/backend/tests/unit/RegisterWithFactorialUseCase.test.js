import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { RegisterWithFactorialUseCase } from '../../src/application/use-cases/auth/RegisterWithFactorialUseCase.js';
import { LoginUseCase } from '../../src/application/use-cases/auth/LoginUseCase.js';

test('RegisterWithFactorialUseCase cria usuário auth com o id do perfil existente', async () => {
  const employee = {
    id: '1370321',
    email: 'andre.baptista@exxata.com.br',
    fullName: 'Andre Rettore Baptista',
    isActive: true
  };

  const existingUser = {
    id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
    email: employee.email,
    name: employee.fullName,
    artiaUserId: '244826'
  };

  const authSession = {
    user: { id: existingUser.id, email: employee.email },
    session: {
      access_token: 'supabase-access-token',
      refresh_token: 'supabase-refresh-token',
      expires_at: 123456
    }
  };

  const factorialService = {
    async getEmployeeByEmail(email) {
      assert.equal(email, employee.email);
      return employee;
    }
  };

  const userRepository = {
    async findByEmail(email) {
      assert.equal(email, employee.email);
      return existingUser;
    },
    async ensureProfile(profile) {
      assert.equal(profile.id, existingUser.id);
      assert.equal(profile.factorialEmployeeId, employee.id);
      return {
        ...profile,
        artiaUserId: existingUser.artiaUserId
      };
    }
  };

  const supabaseAuthService = {
    async getUserById(userId) {
      assert.equal(userId, existingUser.id);
      return null;
    },
    async createUser(payload) {
      assert.equal(payload.id, existingUser.id);
      assert.equal(payload.email, employee.email);
      return {
        id: existingUser.id,
        email: employee.email
      };
    },
    async signInWithPassword(email, password) {
      assert.equal(email, employee.email);
      assert.equal(password, 'Senha1234');
      return authSession;
    }
  };

  const useCase = new RegisterWithFactorialUseCase(
    factorialService,
    userRepository,
    supabaseAuthService
  );

  const result = await useCase.execute(employee.email, 'Senha1234');

  assert.equal(result.token, authSession.session.access_token);
  assert.equal(result.refreshToken, authSession.session.refresh_token);
  assert.equal(result.user.id, existingUser.id);
  assert.equal(result.user.factorialEmployeeId, employee.id);
  assert.equal(result.user.artiaUserId, existingUser.artiaUserId);
});

test('RegisterWithFactorialUseCase bloqueia registro quando auth já existe', async () => {
  const factorialService = {
    async getEmployeeByEmail() {
      return {
        id: '1370321',
        email: 'andre.baptista@exxata.com.br',
        fullName: 'Andre Rettore Baptista',
        isActive: true
      };
    }
  };

  const userRepository = {
    async findByEmail() {
      return {
        id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
        email: 'andre.baptista@exxata.com.br'
      };
    }
  };

  const supabaseAuthService = {
    async getUserById() {
      return {
        id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270'
      };
    }
  };

  const useCase = new RegisterWithFactorialUseCase(
    factorialService,
    userRepository,
    supabaseAuthService
  );

  await assert.rejects(
    () => useCase.execute('andre.baptista@exxata.com.br', 'Senha1234'),
    /Usuário já cadastrado\. Faça login\./
  );
});

test('LoginUseCase migra usuário legado para auth e exige conta ativa no Factorial', async () => {
  const passwordHash = await bcrypt.hash('Senha1234', 4);

  const legacyUser = {
    id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
    email: 'andre.baptista@exxata.com.br',
    name: 'Andre Rettore Baptista',
    passwordHash,
    factorialEmployeeId: '1370321',
    artiaUserId: '244826'
  };

  const factorialService = {
    async getEmployeeById(employeeId) {
      assert.equal(employeeId, legacyUser.factorialEmployeeId);
      return {
        id: employeeId,
        email: legacyUser.email,
        fullName: legacyUser.name,
        isActive: true
      };
    }
  };

  const userRepository = {
    async findByEmail(email) {
      assert.equal(email, legacyUser.email);
      return legacyUser;
    },
    async findById(userId) {
      assert.equal(userId, legacyUser.id);
      return legacyUser;
    },
    async ensureProfile(profile) {
      return {
        ...profile,
        artiaUserId: legacyUser.artiaUserId
      };
    }
  };

  let migrated = false;
  const supabaseAuthService = {
    async signInWithPassword(email, password) {
      assert.equal(email, legacyUser.email);
      assert.equal(password, 'Senha1234');

      if (!migrated) {
        throw new Error('Invalid login credentials');
      }

      return {
        user: {
          id: legacyUser.id,
          email: legacyUser.email,
          user_metadata: { name: legacyUser.name }
        },
        session: {
          access_token: 'supabase-access-token',
          refresh_token: 'supabase-refresh-token',
          expires_at: 123456
        }
      };
    },
    async createUser(payload) {
      migrated = true;
      assert.equal(payload.id, legacyUser.id);
      assert.equal(payload.passwordHash, legacyUser.passwordHash);
      return {
        id: legacyUser.id,
        email: legacyUser.email
      };
    }
  };

  const useCase = new LoginUseCase(
    userRepository,
    supabaseAuthService,
    factorialService
  );

  const result = await useCase.execute(legacyUser.email, 'Senha1234');

  assert.equal(result.token, 'supabase-access-token');
  assert.equal(result.refreshToken, 'supabase-refresh-token');
  assert.equal(result.user.factorialEmployeeId, legacyUser.factorialEmployeeId);
  assert.equal(result.user.artiaUserId, legacyUser.artiaUserId);
});
