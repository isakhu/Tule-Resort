import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ReservationRequest = {
  room_id?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string | null;
  check_in?: string;
  check_out?: string;
  guests?: number;
  special_requests?: string | null;
};

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server Supabase configuration is missing.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return value;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const days = Math.round((end - start) / 86_400_000);
  return days > 0 ? days : 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationRequest;
    const roomId = typeof body.room_id === 'string' ? body.room_id.trim() : '';
    const guestName = typeof body.guest_name === 'string' ? body.guest_name.trim() : '';
    const guestPhone = typeof body.guest_phone === 'string' ? body.guest_phone.trim() : '';
    const checkIn = parseDate(body.check_in);
    const checkOut = parseDate(body.check_out);
    const guests = Number(body.guests ?? 0);

    if (!roomId || guestName.length < 2 || guestPhone.length < 5 || !checkIn || !checkOut || !Number.isInteger(guests) || guests < 1) {
      return NextResponse.json({ success: false, error: 'Missing or invalid reservation details.' }, { status: 400 });
    }

    const nights = nightsBetween(checkIn, checkOut);
    if (!nights || nights > 365) {
      return NextResponse.json({ success: false, error: 'Check-out must be after check-in and within one year.' }, { status: 400 });
    }

    const supabase = adminClient();
    let userId: string | null = null;
    const authMatch = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
    if (authMatch) {
      const { data: authData, error: authError } = await supabase.auth.getUser(authMatch[1]);
      if (authError || !authData.user) {
        return NextResponse.json({ success: false, error: 'Invalid authentication token.' }, { status: 401 });
      }
      userId = authData.user.id;
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id,capacity,is_available,price_per_night')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError) return NextResponse.json({ success: false, error: 'Unable to check room availability.' }, { status: 500 });
    if (!room) return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    if (room.is_available === false) return NextResponse.json({ success: false, error: 'This room is currently unavailable.' }, { status: 400 });
    if (room.capacity != null && guests > Number(room.capacity)) {
      return NextResponse.json({ success: false, error: `This room allows up to ${room.capacity} guests.` }, { status: 400 });
    }

    const pricePerNight = Number(room.price_per_night);
    if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
      return NextResponse.json({ success: false, error: 'The current room price is not configured. Please contact reception.' }, { status: 503 });
    }
    const roomCost = pricePerNight * nights;
    const totalPrice = roomCost + Math.round(roomCost * 0.1);

    const { data: conflicts, error: conflictError } = await supabase
      .from('room_reservations')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
      .limit(1);

    if (conflictError) return NextResponse.json({ success: false, error: 'Unable to confirm room availability. Please try again.' }, { status: 500 });
    if ((conflicts ?? []).length > 0) {
      return NextResponse.json({ success: false, error: 'This room is already booked for those dates. Please choose different dates.' }, { status: 409 });
    }

    // All price/payment/status fields are server-controlled. This endpoint does
    // not claim an online payment was collected or a reservation was confirmed.
    const bookingNumber = `TULE-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      booking_number: bookingNumber,
      room_id: roomId,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: typeof body.guest_email === 'string' ? body.guest_email.trim() || null : null,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      total_price: totalPrice,
      currency: 'ETB',
      payment_method: 'pay_at_resort',
      payment_status: 'pending',
      status: 'pending',
      special_requests: typeof body.special_requests === 'string' ? body.special_requests.trim() || null : null,
      user_id: userId,
    };

    const { data, error } = await supabase.from('room_reservations').insert(payload).select('id,booking_number,total_price,currency,status').single();
    if (error) return NextResponse.json({ success: false, error: 'Unable to save the reservation request. Please try again later.' }, { status: 400 });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to create reservation. Please try again later.' }, { status: 500 });
  }
}
