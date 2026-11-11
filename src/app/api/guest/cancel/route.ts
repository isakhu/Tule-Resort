import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { getVerifiedGuestStay } from '@/lib/guestStayCookie';

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

    const verifiedStay = await getVerifiedGuestStay();
    const stayId = verifiedStay?.id ?? null;
    const roomName = verifiedStay?.room_name ?? null;
    const trimmedSessionToken =
      sessionToken && typeof sessionToken === 'string' && sessionToken.trim()
        ? sessionToken.trim()
        : null;

    if (!stayId && !trimmedSessionToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication or active table session is required to cancel an item.' },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseServer.rpc('cancel_guest_item', {
      p_entity_type: entityType,
      p_entity_id: entityId.trim(),
      p_guest_stay_id: stayId,
      p_room_number: roomName,
      p_reason: reason || 'Cancelled by guest online',
      p_session_token: trimmedSessionToken,
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
