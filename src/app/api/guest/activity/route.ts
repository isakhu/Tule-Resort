import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { getVerifiedGuestStay } from '@/lib/guestStayCookie';
import { requireStaffOrAdmin } from '@/lib/staffAuth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeRoomFilter(roomName: string | null): string | null {
  if (!roomName) return null;
  const cleaned = roomName.replace(/[(),*%_\\]/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

const ORDERS_SELECT = `
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
`;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryStayId = url.searchParams.get('stayId')?.trim() || null;
    const queryRoom = url.searchParams.get('roomNumber')?.trim() || null;
    const queryTable = url.searchParams.get('tableToken')?.trim() || null;
    const querySessionToken = url.searchParams.get('sessionToken')?.trim() || null;

    const authHeader = req.headers.get('authorization');
    let isStaff = false;
    if (authHeader) {
      const staffAuth = await requireStaffOrAdmin(req);
      if (!staffAuth.ok) {
        return NextResponse.json(
          { success: false, error: staffAuth.error || 'Unauthorized.' },
          { status: staffAuth.status ?? 401 },
        );
      }
      isStaff = true;
    }

    let targetStayId: string | null = null;
    let targetRoom: string | null = null;
    let reservation: Record<string, unknown> | null = null;

    if (isStaff) {
      if (queryStayId && !UUID_REGEX.test(queryStayId)) {
        return NextResponse.json({ success: false, error: 'Invalid stayId.' }, { status: 400 });
      }
      targetStayId = queryStayId;
      targetRoom = queryRoom;

      if (!targetStayId && !targetRoom && !queryTable) {
        return NextResponse.json(
          { success: false, error: 'Specify stayId, roomNumber, or tableToken.' },
          { status: 400 },
        );
      }
    } else {
      const verifiedStay = await getVerifiedGuestStay();

      if (verifiedStay) {
        if (!UUID_REGEX.test(verifiedStay.id)) {
          return NextResponse.json({ success: false, error: 'Invalid guest stay session.' }, { status: 401 });
        }

        const { data: dbStay, error: stayErr } = await supabaseServer
          .from('room_reservations')
          .select('*, room:rooms(id, name, type, image_url)')
          .eq('id', verifiedStay.id)
          .eq('status', 'checked_in')
          .maybeSingle();

        if (stayErr || !dbStay) {
          return NextResponse.json(
            {
              success: false,
              error: 'Your room stay session is no longer active. Please sign in again.',
              orders: [],
              requests: [],
              reservation: null,
            },
            { status: 401 },
          );
        }

        if (queryStayId && queryStayId !== dbStay.id) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: cannot view activity for another stay.' },
            { status: 403 },
          );
        }

        const roomData = Array.isArray(dbStay.room) ? dbStay.room[0] : dbStay.room;
        const liveRoomName =
          (roomData && typeof roomData === 'object' && typeof roomData.name === 'string'
            ? roomData.name
            : null) ||
          verifiedStay.room_name ||
          null;

        if (
          queryRoom &&
          liveRoomName &&
          queryRoom.toLowerCase() !== liveRoomName.trim().toLowerCase()
        ) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: cannot view activity for another room.' },
            { status: 403 },
          );
        }

        reservation = dbStay as Record<string, unknown>;
        targetStayId = dbStay.id;
        targetRoom = liveRoomName;
      } else if (queryTable && querySessionToken) {
        // Anonymous dining table guest: must prove active table_sessions token
        const cleanTableToken = queryTable.replace(/[(),*]/g, '').trim();
        let tableQuery = supabaseServer
          .from('dining_tables')
          .select('id')
          .eq('is_active', true);

        tableQuery = UUID_REGEX.test(cleanTableToken)
          ? tableQuery.or(`qr_token.eq.${cleanTableToken},id.eq.${cleanTableToken}`)
          : tableQuery.eq('qr_token', cleanTableToken);

        const { data: tableRow } = await tableQuery.maybeSingle();
        if (!tableRow) {
          return NextResponse.json({ success: false, error: 'Dining table not found.' }, { status: 404 });
        }

        const { data: tableSession } = await supabaseServer
          .from('table_sessions')
          .select('id')
          .eq('table_id', tableRow.id)
          .eq('session_token', querySessionToken)
          .eq('status', 'active')
          .maybeSingle();

        if (!tableSession) {
          return NextResponse.json(
            { success: false, error: 'Valid active table session required.' },
            { status: 403 },
          );
        }

        const { data: tableOrders, error: tableOrdersErr } = await supabaseServer
          .from('orders')
          .select(ORDERS_SELECT)
          .eq('table_session_id', tableSession.id)
          .order('created_at', { ascending: false });

        if (tableOrdersErr) {
          return NextResponse.json({ success: false, error: tableOrdersErr.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          orders: tableOrders ?? [],
          requests: [],
          reservation: null,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Please log in with your room stay or active table session to view activity.',
            orders: [],
            requests: [],
            reservation: null,
          },
          { status: 401 },
        );
      }
    }

    // 1. Fetch Reservation if staff requested stayId
    if (isStaff && targetStayId) {
      const { data: resRow } = await supabaseServer
        .from('room_reservations')
        .select('*, room:rooms(id, name, type, image_url)')
        .eq('id', targetStayId)
        .maybeSingle();

      if (resRow) {
        reservation = resRow as Record<string, unknown>;
      }
    }

    const safeRoom = sanitizeRoomFilter(targetRoom);

    // 2. Fetch Orders
    let ordersQuery = supabaseServer
      .from('orders')
      .select(ORDERS_SELECT)
      .order('created_at', { ascending: false });

    if (targetStayId) {
      if (safeRoom) {
        ordersQuery = ordersQuery.or(
          `guest_stay_id.eq.${targetStayId},and(guest_stay_id.is.null,room_number.ilike.${safeRoom})`,
        );
      } else {
        ordersQuery = ordersQuery.eq('guest_stay_id', targetStayId);
      }
    } else if (safeRoom) {
      ordersQuery = ordersQuery.ilike('room_number', safeRoom);
    } else if (isStaff && queryTable && UUID_REGEX.test(queryTable)) {
      ordersQuery = ordersQuery.eq('dining_table_id', queryTable);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unable to determine activity scope.' },
        { status: 400 },
      );
    }

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) {
      return NextResponse.json({ success: false, error: ordersError.message }, { status: 500 });
    }

    // 3. Fetch Service Requests ONLY when stayId or room is explicitly scoped
    let requests: unknown[] = [];
    if (targetStayId || safeRoom) {
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
        if (safeRoom) {
          requestsQuery = requestsQuery.or(
            `guest_stay_id.eq.${targetStayId},and(guest_stay_id.is.null,room_number.ilike.${safeRoom})`,
          );
        } else {
          requestsQuery = requestsQuery.eq('guest_stay_id', targetStayId);
        }
      } else if (safeRoom) {
        requestsQuery = requestsQuery.ilike('room_number', safeRoom);
      }

      const { data: requestsData, error: requestsError } = await requestsQuery;
      if (requestsError) {
        return NextResponse.json({ success: false, error: requestsError.message }, { status: 500 });
      }
      requests = requestsData ?? [];
    }

    return NextResponse.json({
      success: true,
      orders: orders ?? [],
      requests,
      reservation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error retrieving guest activity.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
