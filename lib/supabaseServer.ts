import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client. MUST only be used in server components or API routes.
// Keep the environment check at runtime so Next.js can finish static build analysis.
const SUPABASE_BUILD_FALLBACK_URL = 'https://placeholder.supabase.co';
const SUPABASE_BUILD_FALLBACK_KEY = 'build-placeholder-key';

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const supabaseUrl = process.env.SUPABASE_URL ?? (isBuildPhase ? SUPABASE_BUILD_FALLBACK_URL : '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? (isBuildPhase ? SUPABASE_BUILD_FALLBACK_KEY : '');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

export default supabaseServer;
