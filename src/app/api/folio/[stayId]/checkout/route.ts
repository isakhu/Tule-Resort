import { NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabaseServer';
import { requireModuleAccess } from '@/lib/staffAuth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ stayId: string }> },
) {
  try {
    const auth = await requireModuleAccess(req, 'receipts');
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const tokenMatch = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch?.[1]?.trim();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing bearer token.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const stayId = resolvedParams.stayId?.trim();

    if (!stayId || !UUID_REGEX.test(stayId)) {
      return NextResponse.json({ success: false, error: 'Valid stayId is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { paymentMethod, processedBy, paymentReference } = body ?? {};

    // Forward the verified staff JWT so migration 032's auth.uid() guard passes
    const userClient = createSupabaseUserClient(token);
    const { data, error } = await userClient.rpc('checkout_and_generate_receipt', {
      p_stay_id: stayId,
      p_payment_method: paymentMethod || 'pay_at_resort',
      p_processed_by: processedBy || 'Front Desk Staff',
      p_payment_reference:
        paymentReference && typeof paymentReference === 'string'
          ? paymentReference.trim().toUpperCase()
          : null,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json({ success: false, error: data?.error || 'Checkout failed.' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error executing checkout.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
