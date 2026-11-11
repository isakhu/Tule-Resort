import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { requireModuleAccess } from '@/lib/staffAuth';
import { calculateResortPricingBreakdown } from '@/lib/pricing';
import { getResortPricingSettings } from '@/lib/resortPricing';

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
  payment_reference?: string;
  special_requests?: string | null;
};

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const days = Math.round((end - start) / 86_400_000);
  return days > 0 ? days : 0;
}

export async function POST(request: Request) {
  try {
    const auth = await requireModuleAccess(request, 'reservations');
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as ReservationRequest;
    const roomId = String(body.room_id ?? '').trim();
    const guestName = String(body.guest_name ?? '').trim();
    const guestPhone = String(body.guest_phone ?? '').trim();
    const checkIn = String(body.check_in ?? '').trim();
    const checkOut = String(body.check_out ?? '').trim();
    const guests = Number(body.guests ?? 0);

    if (!roomId || !guestName || !guestPhone || !checkIn || !checkOut || !Number.isInteger(guests) || guests < 1) {
      return NextResponse.json({ success: false, error: 'Missing or invalid reservation details.' }, { status: 400 });
    }

    const nights = nightsBetween(checkIn, checkOut);
    if (nights <= 0) {
      return NextResponse.json({ success: false, error: 'Check-out must be after check-in.' }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabaseServer
      .from('rooms')
      .select('id, capacity, is_available, price_per_night')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError) return NextResponse.json({ success: false, error: roomError.message }, { status: 500 });
    if (!room) return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    if (room.is_available === false) {
      return NextResponse.json({ success: false, error: 'This room is currently unavailable.' }, { status: 400 });
    }
    if (room.capacity != null && guests > room.capacity) {
      return NextResponse.json({ success: false, error: `This room allows up to ${room.capacity} guests.` }, { status: 400 });
    }

    const pricingSettings = await getResortPricingSettings();
    const roomSubtotal = Number(room.price_per_night ?? 0) * nights;
    const pricing = calculateResortPricingBreakdown(
      roomSubtotal,
      pricingSettings.serviceChargePercent,
      pricingSettings.taxPercent,
    );
    const totalPrice = pricing.grandTotal;

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return NextResponse.json({ success: false, error: 'Unable to determine reservation total price.' }, { status: 400 });
    }

    const bookingNumber =
      String(body.booking_number ?? '').trim() || `TULE-${Date.now().toString(36).toUpperCase()}`;
    const normalizedPaymentRef =
      body.payment_reference && typeof body.payment_reference === 'string'
        ? body.payment_reference.trim().toUpperCase() || null
        : null;

    if (normalizedPaymentRef) {
      const { data: existingRef } = await supabaseServer
        .from('used_payment_references')
        .select('id, entity_type')
        .eq('normalized_reference', normalizedPaymentRef)
        .maybeSingle();

      if (existingRef) {
        return NextResponse.json(
          {
            success: false,
            error: `DUPLICATE_PAYMENT_REFERENCE: Transaction reference "${normalizedPaymentRef}" has already been verified and cannot be reused.`,
          },
          { status: 409 },
        );
      }
    }

    const { data: conflicts, error: conflictError } = await supabaseServer
      .from('room_reservations')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
      .limit(1);

    if (conflictError) return NextResponse.json({ success: false, error: conflictError.message }, { status: 500 });
    if ((conflicts ?? []).length > 0) {
      return NextResponse.json(
        { success: false, error: 'This room is already booked for those dates. Please choose different dates.' },
        { status: 409 },
      );
    }

    const paymentStatus = body.payment_status === 'paid' ? 'paid' : 'pending';

    const payload = {
      booking_number: bookingNumber,
      room_id: roomId,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: body.guest_email?.trim() || null,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      subtotal: pricing.subtotal,
      service_charge_percent: pricing.serviceChargePercent,
      service_charge: pricing.serviceCharge,
      tax_percent: pricing.taxPercent,
      tax: pricing.tax,
      total_price: totalPrice,
      currency: body.currency || pricingSettings.currency || 'ETB',
      payment_method: body.payment_method || 'pay_at_resort',
      payment_status: paymentStatus,
      payment_reference: normalizedPaymentRef,
      status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
      special_requests: body.special_requests?.trim() || null,
      user_id: auth.userId,
    };

    const { data, error } = await supabaseServer
      .from('room_reservations')
      .insert(payload)
      .select('id, booking_number')
      .single();

    if (error) {
      if (error.code === '23505' || /payment_reference|unique/i.test(error.message)) {
        return NextResponse.json(
          { success: false, error: 'DUPLICATE_PAYMENT_REFERENCE: This transaction reference has already been used.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (normalizedPaymentRef && paymentStatus === 'paid' && data?.id) {
      await supabaseServer.rpc('register_payment_reference', {
        p_reference: normalizedPaymentRef,
        p_entity_type: 'reservation',
        p_entity_id: data.id,
        p_amount: totalPrice,
        p_currency: body.currency || 'ETB',
      });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create reservation.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
