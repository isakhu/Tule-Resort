import { NextResponse } from 'next/server';
import supabaseServer, { createSupabaseUserClient } from '@/lib/supabaseServer';
import { requireModuleAccess } from '@/lib/staffAuth';
import { getVerifiedGuestStay } from '@/lib/guestStayCookie';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractBearerToken(req: Request): string | null {
  const match = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ stayId: string }> },
) {
  try {
    const resolvedParams = await params;
    const stayId = resolvedParams.stayId?.trim();

    if (!stayId || !UUID_REGEX.test(stayId)) {
      return NextResponse.json({ success: false, error: 'Valid stayId is required.' }, { status: 400 });
    }

    // Authorize either staff with 'receipts' access OR the checked-in guest matching this stay cookie
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const auth = await requireModuleAccess(req, 'receipts');
      if (!auth.ok) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
      }
    } else {
      const verifiedStay = await getVerifiedGuestStay();
      if (!verifiedStay || verifiedStay.id !== stayId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required to view guest folio.' },
          { status: 401 },
        );
      }
    }

    const { data, error } = await supabaseServer.rpc('calculate_folio', {
      p_stay_id: stayId,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json({ success: false, error: data?.error || 'Unable to calculate folio.' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching folio.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ stayId: string }> },
) {
  try {
    const auth = await requireModuleAccess(req, 'receipts');
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing bearer token.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const stayId = resolvedParams.stayId?.trim();

    if (!stayId || !UUID_REGEX.test(stayId)) {
      return NextResponse.json({ success: false, error: 'Valid stayId is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { description, amount, quantity } = body ?? {};

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ success: false, error: 'Charge description is required.' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than zero.' }, { status: 400 });
    }

    const numericQuantity = quantity === undefined || quantity === null ? 1 : Number(quantity);
    if (!Number.isFinite(numericQuantity) || !Number.isInteger(numericQuantity) || numericQuantity < 1 || numericQuantity > 1000) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a whole number between 1 and 1,000.' },
        { status: 400 },
      );
    }

    // Use the caller's authenticated Supabase JWT so DB-level auth.uid() checks pass cleanly
    const userClient = createSupabaseUserClient(token);
    const { data, error } = await userClient.rpc('add_manual_charge', {
      p_stay_id: stayId,
      p_description: description.trim(),
      p_amount: numericAmount,
      p_quantity: numericQuantity,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json({ success: false, error: data?.error || 'Unable to add charge.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, charge: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error adding manual charge.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
