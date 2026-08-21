import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/adminAuth';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ authorized: false, error: auth.error }, { status: auth.status ?? 401 });
  }

  return NextResponse.json({ authorized: true, userId: auth.userId });
}
