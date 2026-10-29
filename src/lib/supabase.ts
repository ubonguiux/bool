import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// The Vercel project still has the former Bool backend configured. Never let
// the RVM Choir branch write to that project while the dedicated backend is pending.
const legacyBoolProjectUrl = 'https://lvmiplaoxzhtnumlznzq.supabase.co';
export const isRvmBackendConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl.replace(/\/$/, '') !== legacyBoolProjectUrl
);

export const supabase = createClient(
  isRvmBackendConfigured ? supabaseUrl! : 'https://rvm-choir-not-configured.invalid',
  isRvmBackendConfigured ? supabasePublishableKey! : 'rvm-choir-backend-not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
