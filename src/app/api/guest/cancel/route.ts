import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabaseServer from '@/lib/supabaseServer';

const COOKIE_NAME = 'tule_guest_stay';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entityType, entityId, reason, sessionToken } = body ?? {};

    if (!entityType || !['order', 'service_request'].includes(entityType)) {
      return NextResponse.json({ success: false, error: 'Valid entityType (order or service_request) is required.' }, { status: 400 });
    }

    if (!entityId || typeof entityId !== 'string' || !entityId.trim()) {
      return NextResponse.json({ success: false, error: 'entityId is required.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(COOKIE_NAME)?.value;
    let stayId: string | null = null;
    let roomName: string | null = null;

    if (rawCookie) {
      try {
        const parsed = JSON.parse(rawCookie);
        stayId = parsed.id;
        roomName = parsed.room_name;
      } catch {
        // ignore
      }
    }

    const { data, error } = await supabaseServer.rpc('cancel_guest_item', {
      p_entity_type: entityType,
      p_entity_id: entityId.trim(),
      p_guest_stay_id: stayId,
      p_room_number: roomName,
      p_reason: reason || 'Cancelled by guest online',
      p_session_token: sessionToken && typeof sessionToken === 'string' ? sessionToken.trim() : null,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json({ success: false, error: data?.error || 'Cannot cancel this item.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: data.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cancelling item.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
