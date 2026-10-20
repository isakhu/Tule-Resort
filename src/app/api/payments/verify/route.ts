import { NextResponse } from 'next/server';
import { verifyBankPayment } from '@/lib/verifyEt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, bank, accountNumber, expectedAmount, expectedCurrency, checkDuplicate, waitMs } = body ?? {};

    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      return NextResponse.json({
        success: false,
        verified: false,
        error: 'Missing transaction reference or receipt code.',
      }, { status: 400 });
    }

    const result = await verifyBankPayment({
      reference: reference.trim(),
      bank: typeof bank === 'string' ? bank.trim() : undefined,
      accountNumber: typeof accountNumber === 'string' ? accountNumber.trim() : undefined,
      expectedAmount: typeof expectedAmount === 'number' ? expectedAmount : expectedAmount ? Number(expectedAmount) : undefined,
      expectedCurrency: typeof expectedCurrency === 'string' ? expectedCurrency.trim() : 'ETB',
      checkDuplicate: checkDuplicate !== false,
      waitMs: typeof waitMs === 'number' ? waitMs : 7000,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error verifying payment.';
    return NextResponse.json({
      success: false,
      verified: false,
      error: message,
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get('reference') || url.searchParams.get('ref');
    const bank = url.searchParams.get('bank') || undefined;
    const amountStr = url.searchParams.get('amount') || url.searchParams.get('expectedAmount');
    const expectedAmount = amountStr ? Number(amountStr) : undefined;

    if (!reference) {
      return NextResponse.json({
        success: false,
        error: 'Provide a reference query parameter, e.g. /api/payments/verify?reference=FT12345678',
      }, { status: 400 });
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
