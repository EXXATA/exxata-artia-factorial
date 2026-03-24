import { createClient } from '@supabase/supabase-js';
import { createAuthInfrastructureError } from '../../../domain/errors/AuthError.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

const sharedOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
};

const serviceSupabaseClient = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, sharedOptions)
  : null;

export const supabaseAuth = createClient(
  supabaseUrl,
  supabaseAnonKey,
  sharedOptions
);

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, sharedOptions)
  : null;

function createServiceRoleMissingError(context = 'server-side data access') {
  return createAuthInfrastructureError(
    `SUPABASE_SERVICE_ROLE_KEY precisa estar configurada em backend/.env para ${context}.`,
    'SUPABASE_SERVICE_ROLE_KEY_MISSING'
  );
}

export function assertServiceRoleConfigured(context = 'server-side data access') {
  if (!supabaseServiceRoleKey) {
    throw createServiceRoleMissingError(context);
  }

  return supabaseServiceRoleKey;
}

export function getServiceSupabaseClient() {
  assertServiceRoleConfigured('server-side data access');
  return serviceSupabaseClient;
}

export const supabase = new Proxy({}, {
  get(_target, property, receiver) {
    const client = getServiceSupabaseClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export function getSupabaseClient(accessToken, { admin = false } = {}) {
  const apiKey = admin
    ? assertServiceRoleConfigured('administrative Supabase access')
    : supabaseAnonKey;

  if (!accessToken) {
    return createClient(supabaseUrl, apiKey, sharedOptions);
  }

  return createClient(supabaseUrl, apiKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    ...sharedOptions
  });
}

export async function getUserFromAccessToken(accessToken) {
  const client = getSupabaseClient(accessToken);
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}
