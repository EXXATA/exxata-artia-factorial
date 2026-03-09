import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { RegisterWithFactorialUseCase } from '../../src/application/use-cases/auth/RegisterWithFactorialUseCase.js';
import { LoginUseCase } from '../../src/application/use-cases/auth/LoginUseCase.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

test('RegisterWithFactorialUseCase permite primeiro acesso para usuário sincronizado sem senha', async () => {
  const employee = {
    id: '1370321',
    email: 'andre.baptista@exxata.com.br',
    fullName: 'André Rettore Baptista',
    isActive: true
  };

  const existingUser = {
    id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
    email: employee.email,
    name: 'André Rettore Baptista',
    factorialEmployeeId: '1370321',
    artiaUserId: '244826',
    passwordHash: null
  };

  const completedUser = {
    ...existingUser,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv'
  };

  const calls = [];
  const factorialService = {
    async getEmployeeByEmail(email) {
      calls.push(['getEmployeeByEmail', email]);
      return employee;
    }
  };
  const userRepository = {
    async findByEmail(email) {
      calls.push(['findByEmail', email]);
      return existingUser;
    },
    async updateIdentity(userId, payload) {
      calls.push(['updateIdentity', userId, payload]);
      return {
        ...existingUser,
        ...payload
      };
    },
    async updatePassword(userId, passwordHash) {
      calls.push(['updatePassword', userId, passwordHash]);
      assert.ok(passwordHash);
      return completedUser;
    }
  };

  const useCase = new RegisterWithFactorialUseCase(factorialService, userRepository);
  const result = await useCase.execute(employee.email, 'Senha1234');

  assert.equal(result.user.email, employee.email);
  assert.equal(result.user.artiaUserId, '244826');
  assert.equal(result.user.factorialEmployeeId, '1370321');
  assert.ok(result.token);

  const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
  assert.equal(decoded.email, employee.email);
  assert.equal(decoded.artiaUserId, '244826');
  assert.equal(decoded.factorialEmployeeId, '1370321');

  assert.deepEqual(calls[0], ['getEmployeeByEmail', employee.email]);
  assert.deepEqual(calls[1], ['findByEmail', employee.email]);
  assert.equal(calls[2][0], 'updateIdentity');
  assert.equal(calls[3][0], 'updatePassword');
});

test('RegisterWithFactorialUseCase bloqueia registro quando usuário já possui senha', async () => {
  const factorialService = {
    async getEmployeeByEmail() {
      return {
        id: '1370321',
        email: 'andre.baptista@exxata.com.br',
        fullName: 'André Rettore Baptista',
        isActive: true
      };
    }
  };

  const userRepository = {
    async findByEmail() {
      return {
        id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
        email: 'andre.baptista@exxata.com.br',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv'
      };
    }
  };

  const useCase = new RegisterWithFactorialUseCase(factorialService, userRepository);

  await assert.rejects(
    () => useCase.execute('andre.baptista@exxata.com.br', 'Senha1234'),
    /Usuário já cadastrado\. Faça login\./
  );
});

test('LoginUseCase orienta primeiro acesso quando usuário sincronizado ainda não definiu senha', async () => {
  const userRepository = {
    async findByEmail() {
      return {
        id: '7de97a87-9eb0-4cb4-aa00-dd54cccb1270',
        email: 'andre.baptista@exxata.com.br',
        passwordHash: null
      };
    }
  };

  const useCase = new LoginUseCase(userRepository);

  await assert.rejects(
    () => useCase.execute('andre.baptista@exxata.com.br', 'Senha1234'),
    /Usuário sem senha definida\. Use o primeiro acesso para criar sua senha\./
  );
});
