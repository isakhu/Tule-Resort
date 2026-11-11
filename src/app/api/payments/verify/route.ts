import { NextResponse } from 'next/server';
import { verifyBankPayment } from '@/lib/verifyEt';
import { requireStaffOrAdmin } from '@/lib/staffAuth';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 20;
const verifyRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim() || 'unknown';
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function checkRateLimit(clientKey: string): boolean {
  const now = Date.now();
  if (verifyRateLimitMap.size > 500) {
    for (const [key, entry] of verifyRateLimitMap.entries()) {
      if (entry.resetAt <= now) verifyRateLimitMap.delete(key);
    }
  }

  const existing = verifyRateLimitMap.get(clientKey);
  if (!existing || existing.resetAt <= now) {
    verifyRateLimitMap.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  existing.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    let isVerifiedStaff = false;

    if (authHeader) {
      const auth = await requireStaffOrAdmin(req);
      if (!auth.ok) {
        return NextResponse.json(
          { success: false, verified: false, error: auth.error },
          { status: auth.status },
        );
      }
      isVerifiedStaff = true;
    } else {
      const ip = getClientIp(req);
      if (!checkRateLimit(ip)) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            error: 'Too many payment verification attempts. Please wait a few minutes before retrying.',
          },
          { status: 429 },
        );
      }
    }

    const body = await req.json();
    const { reference, bank, accountNumber, expectedAmount, expectedCurrency, checkDuplicate, waitMs } = body ?? {};

    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: 'Missing transaction reference or receipt code.',
        },
        { status: 400 },
      );
    }

    // Only authenticated staff may bypass duplicate reference checks
    const effectiveCheckDuplicate = isVerifiedStaff ? checkDuplicate !== false : true;
    const boundedWaitMs =
      typeof waitMs === 'number' && Number.isFinite(waitMs)
        ? Math.min(Math.max(waitMs, 1000), 15000)
        : 7000;

    const result = await verifyBankPayment({
      reference: reference.trim(),
      bank: typeof bank === 'string' ? bank.trim() : undefined,
      accountNumber: typeof accountNumber === 'string' ? accountNumber.trim() : undefined,
      expectedAmount:
        typeof expectedAmount === 'number'
          ? expectedAmount
          : expectedAmount
            ? Number(expectedAmount)
            : undefined,
      expectedCurrency: typeof expectedCurrency === 'string' ? expectedCurrency.trim() : 'ETB',
      checkDuplicate: effectiveCheckDuplicate,
      waitMs: boundedWaitMs,
    });

    if (!isVerifiedStaff) {
      return NextResponse.json({
        ...result,
        existingEntity: undefined,
        raw: undefined,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error verifying payment.';
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireStaffOrAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const reference = url.searchParams.get('reference') || url.searchParams.get('ref');
    const bank = url.searchParams.get('bank') || undefined;
    const amountStr = url.searchParams.get('amount') || url.searchParams.get('expectedAmount');
    const expectedAmount = amountStr ? Number(amountStr) : undefined;

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide a reference query parameter, e.g. /api/payments/verify?reference=FT12345678',
        },
        { status: 400 },
      );
    }

    const result = await verifyBankPayment({
      reference,
      bank,
      expectedAmount,
      checkDuplicate: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error verifying payment.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
