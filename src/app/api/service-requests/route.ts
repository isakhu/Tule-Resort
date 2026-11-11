import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';
import { requireStaffOrAdmin } from '@/lib/staffAuth';
import { getVerifiedGuestStay } from '@/lib/guestStayCookie';

const SERVICE_DEPT_SLUG_MAP: Record<string, string> = {
  spa: 'Spa',
  'pool-passes': 'Pool',
  'gym-membership': 'Gym',
  'conference-room': 'Front Desk',
  'multi-purpose-halls': 'Front Desk',
  experiences: 'Front Desk',
};

const DEFAULT_PRICES: Record<string, number> = {
  'pool-passes': 400,
  'gym-membership': 500,
  spa: 800,
  'conference-room': 3500,
  'multi-purpose-halls': 15000,
  experiences: 1000,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      serviceId,
      guestName,
      phone,
      roomNumber,
      requestedDate,
      requestedTime,
      partySize,
      notes,
      guestStayId,
    } = body ?? {};

    const cleanName = String(guestName ?? '').trim();
    const cleanPhone = String(phone ?? '').trim();
    const cleanDate = String(requestedDate ?? '').trim();
    const serviceSlug = String(serviceId ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const guests = Math.max(1, Number(partySize ?? 1));

    if (!cleanName) {
      return NextResponse.json({ error: 'Guest name is required.' }, { status: 400 });
    }
    if (!cleanDate) {
      return NextResponse.json({ error: 'Requested date is required.' }, { status: 400 });
    }
    if (!serviceSlug) {
      return NextResponse.json({ error: 'A valid service ID is required.' }, { status: 400 });
    }

    const verifiedStay = await getVerifiedGuestStay();
    let effectiveStayId: string | null = verifiedStay?.id ?? null;

    if (!effectiveStayId && typeof guestStayId === 'string' && guestStayId.trim()) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const staffAuth = await requireStaffOrAdmin(req);
        if (staffAuth.ok) {
          effectiveStayId = guestStayId.trim();
        }
      }
    }

    // 1. Resolve department
    const targetDeptName = SERVICE_DEPT_SLUG_MAP[serviceSlug] || 'Front Desk';
    const { data: deptRow } = await supabaseServer
      .from('departments')
      .select('id, name')
      .ilike('name', `%${targetDeptName}%`)
      .limit(1)
      .maybeSingle();

    if (!deptRow) {
      return NextResponse.json({ error: `Department for ${targetDeptName} is not configured.` }, { status: 500 });
    }

    // 2. Resolve service ID and price from resort_services or service_offerings
    let dbServiceId: string | null = null;
    const unitPrice = DEFAULT_PRICES[serviceSlug] || 500;

    const { data: serviceRow } = await supabaseServer
      .from('resort_services')
      .select('id, name')
      .or(`slug.eq.${serviceSlug},category.ilike.%${serviceSlug}%`)
      .limit(1)
      .maybeSingle();

    if (serviceRow) {
      dbServiceId = serviceRow.id;
    }

    const totalPrice = unitPrice * guests;

    // 3. Resolve 'Pending' status ID (default 1)
    const { data: statusRow } = await supabaseServer
      .from('order_statuses')
      .select('id')
      .ilike('name', 'Pending')
      .limit(1)
      .maybeSingle();

    const pendingStatusId = statusRow?.id ?? 1;

    // 4. Insert service request
    const { data: requestRow, error: insertError } = await supabaseServer
      .from('service_requests')
      .insert({
        guest_stay_id: effectiveStayId,
        service_id: dbServiceId,
        department_id: deptRow.id,
        requested_date: cleanDate,
        requested_time: requestedTime ? String(requestedTime).trim() : null,
        party_size: guests,
        guest_name: cleanName,
        guest_phone: cleanPhone || null,
        room_number: roomNumber ? String(roomNumber).trim() : null,
        notes: notes ? String(notes).trim() : null,
        price: totalPrice,
        status_id: pendingStatusId,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 5. Log initial status to status_history
    await supabaseServer.from('status_history').insert({
      entity_type: 'service_request',
      entity_id: requestRow.id,
      from_status_id: null,
      to_status_id: pendingStatusId,
      notes: 'Initial guest submission',
    });

    // 6. Push notification to the department
    await supabaseServer.from('notifications').insert({
      department_id: deptRow.id,
      payload: {
        event: 'new_service_request',
        request_id: requestRow.id,
        guest_name: cleanName,
        room_number: roomNumber || null,
        service: targetDeptName,
        date: cleanDate,
        party_size: guests,
        price: totalPrice,
      },
    });

    return NextResponse.json({
      success: true,
      requestId: requestRow.id,
      request: requestRow,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireStaffOrAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const rawDeptId = searchParams.get('departmentId');
    const rawStatusId = searchParams.get('statusId');

    let requestedDeptId: number | null = null;
    if (rawDeptId !== null && rawDeptId.trim() !== '' && rawDeptId.trim().toLowerCase() !== 'all') {
      const parsed = Number(rawDeptId.trim());
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: 'Invalid departmentId filter.' },
          { status: 400 },
        );
      }
      requestedDeptId = parsed;
    }

    let parsedStatusId: number | null = null;
    if (rawStatusId !== null && rawStatusId.trim() !== '') {
      const parsed = Number(rawStatusId.trim());
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: 'Invalid statusId filter.' },
          { status: 400 },
        );
      }
      parsedStatusId = parsed;
    }

    let query = supabaseServer
      .from('service_requests')
      .select('*, status:order_statuses(id, name), department:departments(id, name), service:resort_services(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!auth.isAdmin) {
      const allowedDeptIds = auth.departmentIds ?? [];
      if (allowedDeptIds.length === 0) {
        return NextResponse.json({ success: true, requests: [] });
      }
      if (requestedDeptId !== null) {
        if (!allowedDeptIds.includes(requestedDeptId)) {
          return NextResponse.json(
            { error: 'Forbidden: department outside your access scope.' },
            { status: 403 },
          );
        }
        query = query.eq('department_id', requestedDeptId);
      } else {
        query = query.in('department_id', allowedDeptIds);
      }
    } else if (requestedDeptId !== null) {
      query = query.eq('department_id', requestedDeptId);
    }

    if (parsedStatusId !== null) {
      query = query.eq('status_id', parsedStatusId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, requests: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
