import { createClient } from '@supabase/supabase-js';

// Client-side Supabase: the URL and anonymous key are public configuration,
// not secrets. Never use a service-role key in this file.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const buildFallbackUrl = 'https://placeholder.supabase.co';
const buildFallbackAnonKey = 'build-placeholder-anon-key';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? (isBuildPhase ? buildFallbackUrl : '');
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? (isBuildPhase ? buildFallbackAnonKey : '');

if ((!supabaseUrl || !supabaseAnonKey) && !isBuildPhase) {
  // eslint-disable-next-line no-console
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
