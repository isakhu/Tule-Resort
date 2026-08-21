import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const days = Math.round((end - start) / 86_400_000);
  return days > 0 ? days : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, checkIn, checkOut, guests, guestName, guestPhone, guestEmail, specialRequests } = body ?? {};

    const checkInDate = parseDate(checkIn);
    const checkOutDate = parseDate(checkOut);
    if (!checkInDate || !checkOutDate) {
      return NextResponse.json({ error: 'Valid check-in and check-out dates are required.' }, { status: 400 });
    }

    const nights = nightsBetween(checkInDate, checkOutDate);
    if (!nights) {
      return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 });
    }

    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return NextResponse.json({ error: 'Guests must be at least 1.' }, { status: 400 });
    }

    if (typeof roomId !== 'string' || !roomId.trim()) {
      return NextResponse.json({ error: 'Room is required.' }, { status: 400 });
    }
    if (typeof guestName !== 'string' || guestName.trim().length < 2) {
      return NextResponse.json({ error: 'Guest name is required.' }, { status: 400 });
    }
    if (typeof guestPhone !== 'string' || guestPhone.trim().length < 5) {
      return NextResponse.json({ error: 'Guest phone is required.' }, { status: 400 });
    }

    let userId: string | null = null;
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const { data: authData } = await supabaseServer.auth.getUser(match[1]);
      userId = authData?.user?.id ?? null;
    }

    const { data, error } = await supabaseServer.rpc('create_room_reservation', {
      p_room_id: roomId,
      p_check_in: checkInDate,
      p_check_out: checkOutDate,
      p_guests: guestCount,
      p_guest_name: guestName.trim(),
      p_guest_phone: guestPhone.trim(),
      p_guest_email: typeof guestEmail === 'string' ? guestEmail.trim() || null : null,
      p_special_requests: typeof specialRequests === 'string' ? specialRequests.trim() || null : null,
      p_user_id: userId,
    });

    if (error) {
      const message = error.message || 'Unable to create reservation.';
      if (/not available|overlap|already booked/i.test(message)) {
        return NextResponse.json({ error: 'This room is already booked for those dates. Please choose different dates.' }, { status: 409 });
      }
      if (/unavailable for booking/i.test(message)) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      if (/allows up to|Guests must|Guest name|Guest phone|Check-out/i.test(message)) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const reservation = Array.isArray(data) ? data[0] : data;
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation was not created.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookingNumber: reservation.booking_number,
      totalPrice: Number(reservation.total_price ?? 0),
      currency: reservation.currency || 'ETB',
      status: reservation.status || 'pending',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create reservation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
