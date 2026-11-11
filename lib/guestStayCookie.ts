import crypto from 'crypto';
import { cookies } from 'next/headers';

export const GUEST_STAY_COOKIE_NAME = 'tule_guest_stay';

export const GUEST_STAY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export interface GuestStayCookiePayload {
  id: string;
  room_name?: string;
  guest_name?: string;
  checkin_code?: string;
}

const COOKIE_VERSION = 'v1';

function getCookieSigningKey(): Buffer | string {
  const explicitSecret = process.env.GUEST_SESSION_SECRET || process.env.SESSION_SECRET;
  if (explicitSecret && explicitSecret.trim().length > 0) {
    return explicitSecret.trim();
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && serviceRoleKey.trim().length > 0) {
    // Derive a domain-separated HMAC key from the server-only Supabase secret
    // so existing deployments work securely even before setting GUEST_SESSION_SECRET.
    return crypto
      .createHmac('sha256', 'tule-guest-stay-hmac-v1')
      .update(serviceRoleKey.trim())
      .digest();
  }

  throw new Error('Missing GUEST_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY for guest session signing.');
}

export function signGuestStayCookie<T extends GuestStayCookiePayload>(stay: T): string {
  const payloadB64 = Buffer.from(JSON.stringify(stay), 'utf8').toString('base64url');
  const signedBody = `${COOKIE_VERSION}.${payloadB64}`;
  const signatureB64 = crypto
    .createHmac('sha256', getCookieSigningKey())
    .update(signedBody)
    .digest('base64url');

  return `${signedBody}.${signatureB64}`;
}

export function verifyGuestStayCookie<T extends GuestStayCookiePayload = GuestStayCookiePayload>(
  rawCookie?: string | null,
): T | null {
  if (!rawCookie || typeof rawCookie !== 'string') {
    return null;
  }

  const parts = rawCookie.split('.');
  if (parts.length !== 3 || parts[0] !== COOKIE_VERSION) {
    return null;
  }

  const [, payloadB64, providedSigB64] = parts;
  if (!payloadB64 || !providedSigB64) {
    return null;
  }

  try {
    const signedBody = `${COOKIE_VERSION}.${payloadB64}`;
    const expectedSig = crypto
      .createHmac('sha256', getCookieSigningKey())
      .update(signedBody)
      .digest();
    const providedSig = Buffer.from(providedSigB64, 'base64url');

    if (providedSig.length !== expectedSig.length || !crypto.timingSafeEqual(providedSig, expectedSig)) {
      return null;
    }

    const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(decodedJson) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
      return null;
    }

    return candidate as T;
  } catch {
    return null;
  }
}

export async function getVerifiedGuestStay<T extends GuestStayCookiePayload = GuestStayCookiePayload>(): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(GUEST_STAY_COOKIE_NAME)?.value;
    return verifyGuestStayCookie<T>(raw);
  } catch {
    return null;
  }
}
