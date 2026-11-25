/** Environment access. Secrets are read lazily and only on the server. */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name}. See .env.example.`);
  return value;
}

export const publicEnv = {
  get supabaseUrl() { return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL); },
  get supabaseAnonKey() { return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); },
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
};

export const serverEnv = {
  serviceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  paystackSecret: () => process.env.PAYSTACK_SECRET_KEY || '',
  paystackEnabled: () => Boolean(process.env.PAYSTACK_SECRET_KEY)
};
