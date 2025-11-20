// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Dev mode: bypass real authentication
export const DEV_MODE = process.env.NEXT_PUBLIC_AUTH_DEV_MODE === 'true';

if (!DEV_MODE && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    'Supabase env vars not set. Either set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
    'or enable dev mode with NEXT_PUBLIC_AUTH_DEV_MODE=true'
  );
}

// Create Supabase client (only if not in dev mode)
export const supabaseServer = DEV_MODE
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);

