import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ stayId: string }> }
) {
  try {
    const resolvedParams = await params;
    const stayId = resolvedParams.stayId;

    if (!stayId) {
      return NextResponse.json({ success: false, error: 'stayId is required.' }, { status: 400 });
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
  { params }: { params: Promise<{ stayId: string }> }
) {
  try {
    const resolvedParams = await params;
    const stayId = resolvedParams.stayId;

    const body = await req.json();
    const { description, amount, quantity } = body ?? {};

    if (!stayId) {
      return NextResponse.json({ success: false, error: 'stayId is required.' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ success: false, error: 'Charge description is required.' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than zero.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer.rpc('add_manual_charge', {
      p_stay_id: stayId,
      p_description: description.trim(),
      p_amount: numericAmount,
      p_quantity: Number(quantity) || 1,
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
