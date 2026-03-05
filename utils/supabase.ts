import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

// Build-safe fallback values prevent prerender crashes when env vars are missing.
// Real values from env will be used in deployed/runtime environments.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
// Note: Use the key name exactly as you defined it in your .env
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  "placeholder-anon-key";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
