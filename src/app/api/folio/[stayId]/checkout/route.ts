import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ stayId: string }> }
) {
  try {
    const resolvedParams = await params;
    const stayId = resolvedParams.stayId;

    const body = await req.json();
    const { paymentMethod, processedBy, paymentReference } = body ?? {};

    if (!stayId) {
      return NextResponse.json({ success: false, error: 'stayId is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer.rpc('checkout_and_generate_receipt', {
      p_stay_id: stayId,
      p_payment_method: paymentMethod || 'pay_at_resort',
      p_processed_by: processedBy || 'Front Desk Staff',
      p_payment_reference: paymentReference && typeof paymentReference === 'string' ? paymentReference.trim().toUpperCase() : null,
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
