import { createClient } from '@supabase/supabase-js';

// Client-side Supabase configuration. Preview deployments may intentionally run
// without backend credentials; keep public pages renderable in that case.
// Data-backed actions still require the real URL and anon key to be configured.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase client is not configured for this environment. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable data-backed guest features.',
  );
}

// Do not let a missing preview-only configuration crash Next.js while it
// evaluates client-component modules during static page generation.
// The fallback is only for rendering; it is not a working backend endpoint.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'preview-not-configured',
);

export default supabase;
