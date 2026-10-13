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
  payment_method?: string;
  special_requests?: string | null;
};

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server Supabase configuration is missing.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function parseDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00.000Z`);
  const end = Date.parse(`${checkOut}T00:00:00.000Z`);
  const nights = Math.round((end - start) / 86_400_000);
  return Number.isFinite(start) && Number.isFinite(end) && nights > 0 ? nights : 0;
}

const PAYMENT_METHODS = new Set(['pay_at_resort', 'telebirr', 'cbe_birr', 'bank_transfer']);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationRequest;
    const roomId = String(body.room_id ?? '').trim();
    const guestName = String(body.guest_name ?? '').trim();
    const guestPhone = String(body.guest_phone ?? '').trim();
    const checkIn = parseDate(body.check_in);
    const checkOut = parseDate(body.check_out);
    const guests = Number(body.guests ?? 0);

    if (!roomId || guestName.length < 2 || guestPhone.length < 5 || !checkIn || !checkOut) {
      return NextResponse.json({ success: false, error: 'Please provide valid reservation details.' }, { status: 400 });
    }

    const nights = nightsBetween(checkIn, checkOut);
    if (!nights) {
      return NextResponse.json({ success: false, error: 'Check-out must be after check-in.' }, { status: 400 });
    }
    if (!Number.isInteger(guests) || guests < 1) {
      return NextResponse.json({ success: false, error: 'Guest count must be a positive whole number.' }, { status: 400 });
    }

    let userId: string | null = null;
    const authorization = request.headers.get('authorization');
    const supabase = adminClient();
    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);
      if (!match) return NextResponse.json({ success: false, error: 'Invalid authorization header.' }, { status: 401 });
      const { data: authData, error: authError } = await supabase.auth.getUser(match[1]);
      if (authError || !authData.user) {
        return NextResponse.json({ success: false, error: 'Your session has expired. Please sign in again.' }, { status: 401 });
      }
      userId = authData.user.id;
    }

    // Calculate the quoted total from trusted room data, never from the browser.
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id,capacity,max_occupancy,is_available,is_active,price_per_night,base_price')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError) {
      console.error('Unable to validate selected room:', roomError.message);
      return NextResponse.json({ success: false, error: 'Room booking is temporarily unavailable.' }, { status: 503 });
    }
    if (!room) return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    if (room.is_active === false || room.is_available === false) {
      return NextResponse.json({ success: false, error: 'This room is currently unavailable.' }, { status: 409 });
    }

    const capacity = Number(room.max_occupancy ?? room.capacity ?? 2);
    if (guests > capacity) {
      return NextResponse.json({ success: false, error: `This room allows up to ${capacity} guests.` }, { status: 400 });
    }

    const nightlyRate = Number(room.price_per_night ?? room.base_price ?? 0);
    if (!Number.isFinite(nightlyRate) || nightlyRate < 0) {
      console.error('Invalid configured nightly rate for room:', roomId);
      return NextResponse.json({ success: false, error: 'This room is not configured for booking yet.' }, { status: 503 });
    }
    const totalPrice = Number((nightlyRate * nights).toFixed(2));
    const paymentMethod = String(body.payment_method ?? 'pay_at_resort');
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Please select a supported payment method.' }, { status: 400 });
    }

    const { data: conflicts, error: conflictError } = await supabase
      .from('room_reservations')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
      .limit(1);

    if (conflictError) {
      console.error('Unable to check room availability:', conflictError.message);
      return NextResponse.json({ success: false, error: 'Unable to check availability right now.' }, { status: 503 });
    }
    if ((conflicts ?? []).length > 0) {
      return NextResponse.json({ success: false, error: 'This room is already booked for those dates. Please choose different dates.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('room_reservations')
      .insert({
        room_id: roomId,
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_email: typeof body.guest_email === 'string' ? body.guest_email.trim() || null : null,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        total_price: totalPrice,
        currency: 'ETB',
        payment_method: paymentMethod,
        payment_status: 'pending',
        status: 'pending',
        special_requests: typeof body.special_requests === 'string' ? body.special_requests.trim() || null : null,
        user_id: userId,
      })
      .select('id,booking_number,total_price,currency,status')
      .single();

    if (error) {
      // A database trigger also prevents overlaps; it is authoritative in a race.
      if (/room is not available|overlap|already booked/i.test(error.message)) {
        return NextResponse.json({ success: false, error: 'This room is already booked for those dates. Please choose different dates.' }, { status: 409 });
      }
      console.error('Reservation insert failed:', error.message);
      return NextResponse.json({ success: false, error: 'We could not save your reservation. Please try again.' }, { status: 503 });
    }

    return NextResponse.json({ success: true, data }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Unexpected reservation API failure:', error);
    return NextResponse.json({ success: false, error: 'Reservation submission failed. Please try again.' }, { status: 500 });
  }
}
