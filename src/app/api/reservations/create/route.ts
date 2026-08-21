import { NextResponse } from 'next/server';
import supabaseServer from '../../../../../lib/supabaseServer';

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const days = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  return days > 0 ? days : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomId,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestPhone,
      guestEmail,
      specialRequests,
    } = body ?? {};

    if (typeof roomId !== 'string' || !roomId.trim()) {
      return NextResponse.json({ error: 'Room is required.' }, { status: 400 });
    }

    if (typeof guestName !== 'string' || guestName.trim().length < 2) {
      return NextResponse.json({ error: 'Guest name is required.' }, { status: 400 });
    }

    if (typeof guestPhone !== 'string' || guestPhone.trim().length < 5) {
      return NextResponse.json({ error: 'Guest phone is required.' }, { status: 400 });
    }

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

    const { data: room, error: roomError } = await supabaseServer
      .from('rooms')
      .select('id,name,price,currency,capacity,is_active,is_available')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError) {
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    if (!room.is_active || !room.is_available) {
      return NextResponse.json({ error: 'This room is currently unavailable for booking.' }, { status: 409 });
    }

    const capacity = Number(room.capacity ?? 0);
    if (capacity > 0 && guestCount > capacity) {
      return NextResponse.json({ error: `This room allows up to ${capacity} guest${capacity === 1 ? '' : 's'}.` }, { status: 400 });
    }

    const nightlyRate = Number(room.price ?? 0);
    if (!Number.isFinite(nightlyRate) || nightlyRate < 0) {
      return NextResponse.json({ error: 'Room pricing is not configured correctly.' }, { status: 500 });
    }

    const totalPrice = nightlyRate * nights;

    // Attach the Supabase Auth user when a valid bearer token is supplied.
    // Anonymous bookings remain supported with user_id = null.
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const { data: authData } = await supabaseServer.auth.getUser(match[1]);
      userId = authData?.user?.id ?? null;
    }

    const { data, error } = await supabaseServer
      .from('room_reservations')
      .insert({
        room_id: room.id,
        user_id: userId,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        guest_email: typeof guestEmail === 'string' && guestEmail.trim() ? guestEmail.trim() : null,
        check_in: checkIn,
        check_out: checkOut,
        guests: guestCount,
        total_price: totalPrice,
        currency: room.currency || 'ETB',
        status: 'pending',
        payment_method: 'pay_at_resort',
        payment_status: 'pending',
        special_requests: typeof specialRequests === 'string' && specialRequests.trim() ? specialRequests.trim() : null,
      })
      .select('id,booking_number,total_price,currency,status')
      .single();

    if (error) {
      if (/not available for the selected dates/i.test(error.message)) {
        return NextResponse.json({ error: 'Room is not available for the selected dates.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookingNumber: data.booking_number,
      totalPrice: Number(data.total_price ?? totalPrice),
      currency: data.currency || room.currency || 'ETB',
      status: data.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create reservation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
