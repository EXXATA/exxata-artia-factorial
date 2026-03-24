import assert from 'node:assert/strict';
import test from 'node:test';
import { CorporateMicrosoftIdentityPolicy } from '../../src/domain/services/CorporateMicrosoftIdentityPolicy.js';

function buildAuthUser(overrides = {}) {
  return {
    id: 'f2d2db7d-301f-4063-9104-8227b1814b1d',
    email: 'andre.baptista@exxata.com.br',
    app_metadata: {
      provider: 'azure',
      providers: ['azure']
    },
    identities: [
      {
        provider: 'azure',
        identity_data: {
          email: 'andre.baptista@exxata.com.br',
          tid: 'tenant-exxata'
        }
      }
    ],
    user_metadata: {
      full_name: 'Andre Baptista'
    },
    ...overrides
  };
}

test('CorporateMicrosoftIdentityPolicy aceita usuário Microsoft corporativo', () => {
  const policy = new CorporateMicrosoftIdentityPolicy({
    allowedDomain: 'exxata.com.br',
    allowedTenantId: 'tenant-exxata'
  });

  const result = policy.assertEligible(buildAuthUser());

  assert.equal(result.email, 'andre.baptista@exxata.com.br');
  assert.deepEqual(result.providers, ['azure']);
});

test('CorporateMicrosoftIdentityPolicy rejeita domínio fora da Exxata', () => {
  const policy = new CorporateMicrosoftIdentityPolicy({
    allowedDomain: 'exxata.com.br'
  });

  assert.throws(
    () => policy.assertEligible(buildAuthUser({ email: 'andre@gmail.com' })),
    /Acesso restrito a contas corporativas/
  );
});

test('CorporateMicrosoftIdentityPolicy rejeita provider não Microsoft', () => {
  const policy = new CorporateMicrosoftIdentityPolicy({
    allowedDomain: 'exxata.com.br'
  });

  assert.throws(
    () => policy.assertEligible(buildAuthUser({
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      identities: [
        {
          provider: 'email',
          identity_data: {
            email: 'andre.baptista@exxata.com.br'
          }
        }
      ]
    })),
    /login Microsoft corporativo/
  );
});
