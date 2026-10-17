import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabaseServer from '@/lib/supabaseServer';

const COOKIE_NAME = 'tule_guest_stay';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryStayId = url.searchParams.get('stayId');
    const queryRoom = url.searchParams.get('roomNumber');
    const queryPhone = url.searchParams.get('phone');
    const queryTable = url.searchParams.get('tableToken');

    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(COOKIE_NAME)?.value;

    let sessionStayId: string | null = null;
    let sessionRoomName: string | null = null;
    let sessionGuestName: string | null = null;

    if (rawCookie) {
      try {
        const parsed = JSON.parse(rawCookie);
        sessionStayId = parsed.id;
        sessionRoomName = parsed.room_name;
        sessionGuestName = parsed.guest_name;
      } catch {
        // ignore malformed cookie
      }
    }

    const targetStayId = queryStayId || sessionStayId;
    const targetRoom = queryRoom || sessionRoomName;

    // 1. Fetch Reservation if stayId known
    let reservation = null;
    if (targetStayId) {
      const { data: resRow } = await supabaseServer
        .from('room_reservations')
        .select('*, room:rooms(id, name, type, image_url)')
        .eq('id', targetStayId)
        .maybeSingle();

      if (resRow) {
        reservation = resRow;
      }
    }

    // 2. Fetch Orders
    // Link by guest_stay_id, room_number, or table_token
    let ordersQuery = supabaseServer
      .from('orders')
      .select(`
        id,
        created_at,
        updated_at,
        status_id,
        total,
        notes,
        room_number,
        guest_name,
        dining_table_id,
        table_session_id,
        guest_stay_id,
        status:order_statuses(id, name),
        department:departments(id, name),
        order_items(
          id,
          quantity,
          price,
          menu_item:menu_items(id, name, amharic_name, image_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (targetStayId) {
      if (targetRoom) {
        ordersQuery = ordersQuery.or(`guest_stay_id.eq.${targetStayId},room_number.ilike.%${targetRoom}%`);
      } else {
        ordersQuery = ordersQuery.eq('guest_stay_id', targetStayId);
      }
    } else if (targetRoom) {
      ordersQuery = ordersQuery.ilike('room_number', `%${targetRoom}%`);
    } else if (queryTable) {
      ordersQuery = ordersQuery.eq('dining_table_id', queryTable);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Please log in with your room or provide identification to view activity.',
        orders: [],
        requests: [],
        reservation: null,
      }, { status: 401 });
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      return NextResponse.json({ success: false, error: ordersError.message }, { status: 500 });
    }

    // 3. Fetch Service Requests
    let requestsQuery = supabaseServer
      .from('service_requests')
      .select(`
        id,
        created_at,
        updated_at,
        service_id,
        offering_id,
        department_id,
        requested_date,
        requested_time,
        party_size,
        guest_name,
        guest_phone,
        room_number,
        notes,
        price,
        status_id,
        status:order_statuses(id, name),
        department:departments(id, name)
      `)
      .order('created_at', { ascending: false });

    if (targetStayId) {
      if (targetRoom) {
        requestsQuery = requestsQuery.or(`guest_stay_id.eq.${targetStayId},room_number.ilike.%${targetRoom}%`);
      } else {
        requestsQuery = requestsQuery.eq('guest_stay_id', targetStayId);
      }
    } else if (targetRoom) {
      requestsQuery = requestsQuery.ilike('room_number', `%${targetRoom}%`);
    }

    const { data: requests, error: requestsError } = await requestsQuery;

    if (requestsError) {
      return NextResponse.json({ success: false, error: requestsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orders: orders ?? [],
      requests: requests ?? [],
      reservation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error retrieving guest activity.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
