import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

if (!supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not configured. Admin auth flows will be unavailable.');
}

const sharedOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
};

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  sharedOptions
);

export const supabaseAuth = createClient(
  supabaseUrl,
  supabaseAnonKey,
  sharedOptions
);

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, sharedOptions)
  : null;

export function getSupabaseClient(accessToken, { admin = false } = {}) {
  const apiKey = admin ? (supabaseServiceRoleKey || supabaseAnonKey) : supabaseAnonKey;

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
