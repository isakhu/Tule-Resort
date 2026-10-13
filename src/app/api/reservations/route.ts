import { NextResponse } from 'next/server';
import supabaseServer from '../../../../lib/supabaseServer';

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

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return value;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_METHODS = new Set(['pay_at_resort', 'telebirr', 'cbe_birr', 'bank_transfer']);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationRequest;
    const roomId = typeof body.room_id === 'string' ? body.room_id.trim() : '';
    const guestName = typeof body.guest_name === 'string' ? body.guest_name.trim() : '';
    const guestPhone = typeof body.guest_phone === 'string' ? body.guest_phone.trim() : '';
    const guestEmail = typeof body.guest_email === 'string' ? body.guest_email.trim() || null : null;
    const specialRequests = typeof body.special_requests === 'string' ? body.special_requests.trim() || null : null;
    const checkIn = parseDate(body.check_in);
    const checkOut = parseDate(body.check_out);
    const guests = Number(body.guests ?? 0);
    const paymentMethod = typeof body.payment_method === 'string' ? body.payment_method : 'pay_at_resort';

    if (!UUID_PATTERN.test(roomId)) {
      return NextResponse.json({ success: false, error: 'Please select a valid room.' }, { status: 400 });
    }
    if (guestName.length < 2 || guestName.length > 150 || guestPhone.length < 5 || guestPhone.length > 40) {
      return NextResponse.json({ success: false, error: 'Please provide a valid guest name and phone number.' }, { status: 400 });
    }
    if (guestEmail && (guestEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))) {
      return NextResponse.json({ success: false, error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      return NextResponse.json({ success: false, error: 'Please choose valid check-in and check-out dates.' }, { status: 400 });
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > 30) {
      return NextResponse.json({ success: false, error: 'Guest count must be a whole number between 1 and 30.' }, { status: 400 });
    }
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Please select a supported payment method.' }, { status: 400 });
    }
    if (specialRequests && specialRequests.length > 2000) {
      return NextResponse.json({ success: false, error: 'Special requests must be 2,000 characters or fewer.' }, { status: 400 });
    }

    let userId: string | null = null;
    const authorization = request.headers.get('authorization');
    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Invalid authorization header.' }, { status: 401 });
      }
      const { data: authData, error: authError } = await supabaseServer.auth.getUser(match[1]);
      if (authError || !authData.user) {
        return NextResponse.json({ success: false, error: 'Your session has expired. Please sign in again.' }, { status: 401 });
      }
      userId = authData.user.id;
    }

    // The database locks the selected room, checks date overlaps, computes the
    // price from trusted room data, and inserts the booking atomically.
    // Client-supplied booking numbers, prices, currency, and user IDs are ignored.
    const { data, error } = await supabaseServer.rpc('create_room_reservation_with_payment', {
      p_room_id: roomId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_guest_name: guestName,
      p_guest_phone: guestPhone,
      p_guest_email: guestEmail,
      p_special_requests: specialRequests,
      p_payment_method: paymentMethod,
      p_user_id: userId,
    });

    if (error) {
      const message = error.message || '';
      if (/already booked|overlap|room is not available/i.test(message)) {
        return NextResponse.json(
          { success: false, error: 'This room is already booked for those dates. Please choose different dates.' },
          { status: 409 },
        );
      }
      if (/room not found/i.test(message)) {
        return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
      }
      if (/currently unavailable/i.test(message)) {
        return NextResponse.json({ success: false, error: 'This room is currently unavailable.' }, { status: 409 });
      }
      if (/guest|check-out|check-in|unsupported payment method|payment method/i.test(message)) {
        return NextResponse.json({ success: false, error: message }, { status: 400 });
      }

      console.error('Atomic reservation creation failed:', message);
      return NextResponse.json(
        { success: false, error: 'We could not save your reservation. Please try again shortly.' },
        { status: 503 },
      );
    }

    const reservation = Array.isArray(data) ? data[0] : data;
    if (!reservation?.id || !reservation?.booking_number) {
      console.error('Reservation RPC returned no booking record.');
      return NextResponse.json(
        { success: false, error: 'No booking confirmation was returned. Please contact the resort before retrying.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: reservation.id,
        booking_number: reservation.booking_number,
        total_price: Number(reservation.total_price ?? 0),
        currency: reservation.currency || 'ETB',
        status: reservation.status || 'pending',
      },
    }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Unexpected reservation API failure:', error);
    return NextResponse.json(
      { success: false, error: 'Reservation submission failed. Please try again.' },
      { status: 500 },
    );
  }
}
