import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabaseServer from '@/lib/supabaseServer';

const COOKIE_NAME = 'tule_guest_stay';

export interface GuestStayData {
  id: string;
  booking_number: string;
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomNumber, identifier } = body ?? {};

    if (!roomNumber || typeof roomNumber !== 'string' || !roomNumber.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your Room Number or Room Name.' }, { status: 400 });
    }

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter your Booking Number or Last Name.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer.rpc('verify_guest_stay', {
      p_room_identifier: roomNumber.trim(),
      p_verification: identifier.trim(),
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message || 'Database error verifying stay.' }, { status: 500 });
    }

    if (!data?.success || !data?.stay) {
      return NextResponse.json({
        success: false,
        error: data?.error || 'No active checked-in stay found for this room and booking number or name.'
      }, { status: 404 });
    }

    const stay: GuestStayData = data.stay;

    // Set HTTP-only secure cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, JSON.stringify(stay), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, stay });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to verify guest stay.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;

    if (!raw) {
      return NextResponse.json({ authenticated: false });
    }

    let parsedStay: GuestStayData;
    try {
      parsedStay = JSON.parse(raw);
    } catch {
      cookieStore.delete(COOKIE_NAME);
      return NextResponse.json({ authenticated: false });
    }

    // Live verification that stay is still checked_in in Supabase
    const { data: dbStay, error } = await supabaseServer
      .from('room_reservations')
      .select('id, booking_number, guest_name, guest_phone, guest_email, check_in, check_out, status, room:rooms(id, name)')
      .eq('id', parsedStay.id)
      .eq('status', 'checked_in')
      .maybeSingle();

    if (error || !dbStay) {
      cookieStore.delete(COOKIE_NAME);
      return NextResponse.json({ authenticated: false, reason: 'Stay is no longer active or checked in.' });
    }

    const roomData = Array.isArray(dbStay.room) ? dbStay.room[0] : dbStay.room;

    const liveStay: GuestStayData = {
      id: dbStay.id,
      booking_number: dbStay.booking_number,
      guest_name: dbStay.guest_name,
      guest_phone: dbStay.guest_phone || undefined,
      guest_email: dbStay.guest_email || undefined,
      room_id: roomData?.id || parsedStay.room_id,
      room_name: roomData?.name || parsedStay.room_name,
      check_in: dbStay.check_in,
      check_out: dbStay.check_out,
      status: dbStay.status,
    };

    return NextResponse.json({ authenticated: true, stay: liveStay });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error checking guest session.';
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error clearing guest session.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
