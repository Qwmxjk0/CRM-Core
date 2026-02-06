import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!adminClient) {
    const env = getEnv();
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
};

export const getSupabaseAnon = (): SupabaseClient => {
  if (!anonClient) {
    const env = getEnv();
    anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
};

export const supabaseWithAuth = (accessToken: string): SupabaseClient => {
  const env = getEnv();
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
