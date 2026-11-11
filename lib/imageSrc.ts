export const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';

const DEFAULT_OPTIMIZABLE_SUFFIXES = ['.supabase.co'];
const DEFAULT_OPTIMIZABLE_HOSTS = new Set(['images.unsplash.com']);

export function getConfiguredSupabaseHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw || raw.includes('placeholder')) return null;
  try {
    const parsed = new URL(raw);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

/**
 * Allows `next/image` optimization for local assets and configured remote CDNs,
 * falling back to `unoptimized` for arbitrary staff-pasted external URLs or blobs.
 */
export function isOptimizableImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return !trimmed.includes('?');
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (DEFAULT_OPTIMIZABLE_HOSTS.has(parsed.hostname)) return true;
    const configuredHost = getConfiguredSupabaseHostname();
    if (configuredHost && parsed.hostname === configuredHost) return true;
    return DEFAULT_OPTIMIZABLE_SUFFIXES.some(
      (suffix) =>
        parsed.hostname.endsWith(suffix) &&
        parsed.pathname.startsWith('/storage/v1/object/')
    );
  } catch {
    return false;
  }
}

/**
 * Guards live URL input previews against invalid or partial relative values.
 */
export function isRenderableImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  return (
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  );
}

