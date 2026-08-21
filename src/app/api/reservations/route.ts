import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ReservationRequest = {
  booking_number?: string;
  room_id?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string | null;
  check_in?: string;
  check_out?: string;
  guests?: number;
  total_price?: number;
  currency?: string;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  special_requests?: string | null;
  user_id?: string | null;
};

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server Supabase configuration is missing.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationRequest;
    const roomId = String(body.room_id ?? '').trim();
    const guestName = String(body.guest_name ?? '').trim();
    const guestPhone = String(body.guest_phone ?? '').trim();
    const checkIn = String(body.check_in ?? '').trim();
    const checkOut = String(body.check_out ?? '').trim();
    const guests = Number(body.guests ?? 0);
    const totalPrice = Number(body.total_price ?? 0);

    if (!roomId || !guestName || !guestPhone || !checkIn || !checkOut || guests < 1 || totalPrice < 0) {
      return NextResponse.json({ success: false, error: 'Missing or invalid reservation details.' }, { status: 400 });
    }
    if (new Date(`${checkOut}T00:00:00`).getTime() <= new Date(`${checkIn}T00:00:00`).getTime()) {
      return NextResponse.json({ success: false, error: 'Check-out must be after check-in.' }, { status: 400 });
    }

    const supabase = adminClient();
    const bookingNumber = String(body.booking_number ?? '').trim() || `TULE-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      booking_number: bookingNumber,
      room_id: roomId,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: body.guest_email?.trim() || null,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      total_price: totalPrice,
      currency: body.currency || 'ETB',
      payment_method: body.payment_method || 'pay_at_resort',
      payment_status: body.payment_status || 'pending',
      status: 'pending',
      special_requests: body.special_requests?.trim() || null,
      user_id: body.user_id ?? null,
    };

    const { data: room, error: roomError } = await supabase.from('rooms').select('id,capacity,is_available').eq('id', roomId).maybeSingle();
    if (roomError) return NextResponse.json({ success: false, error: roomError.message }, { status: 500 });
    if (!room) return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    if (room.is_available === false) return NextResponse.json({ success: false, error: 'This room is currently unavailable.' }, { status: 400 });
    if (room.capacity != null && guests > room.capacity) return NextResponse.json({ success: false, error: `This room allows up to ${room.capacity} guests.` }, { status: 400 });

    const { data: conflicts, error: conflictError } = await supabase
      .from('room_reservations')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
      .limit(1);

    if (conflictError) return NextResponse.json({ success: false, error: conflictError.message }, { status: 500 });
    if ((conflicts ?? []).length > 0) return NextResponse.json({ success: false, error: 'This room is already booked for those dates. Please choose different dates.' }, { status: 409 });

    const { data, error } = await supabase.from('room_reservations').insert(payload).select('id,booking_number').single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create reservation.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
