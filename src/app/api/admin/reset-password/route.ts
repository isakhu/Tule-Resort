import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';
import { requireAdmin } from '../../../../../lib/adminAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    const body = await req.json();
    const { userId, newPassword } = body;
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'userId and newPassword are required' }, { status: 400 });
    }

    // Use Supabase Admin to update the user's password. This requires service role key.
    const { data, error } = await supabaseServer.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, user: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
