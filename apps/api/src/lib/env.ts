type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  authEmailRedirectUrl?: string;
};

export const getEnv = (): Env => {
  const required = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing env var: ${key}`);
    }
    return value;
  };
  const optional = (key: string): string | undefined => {
    const value = process.env[key]?.trim();
    return value ? value : undefined;
  };

  return {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseAnonKey: required("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    authEmailRedirectUrl: optional("AUTH_EMAIL_REDIRECT_URL"),
  };
};
