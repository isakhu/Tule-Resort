import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';

const SERVICE_DEPT_SLUG_MAP: Record<string, string> = {
  spa: 'Spa',
  'pool-passes': 'Pool',
  'gym-membership': 'Gym',
  'conference-room': 'Front Desk',
  'multi-purpose-halls': 'Front Desk',
  experiences: 'Front Desk',
};

const DEFAULT_PRICES: Record<string, number> = {
  'pool-passes': 250,
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
    const serviceSlug = String(serviceId ?? '').trim().toLowerCase();
    const guests = Math.max(1, Number(partySize ?? 1));

    if (!cleanName) {
      return NextResponse.json({ error: 'Guest name is required.' }, { status: 400 });
    }
    if (!cleanDate) {
      return NextResponse.json({ error: 'Requested date is required.' }, { status: 400 });
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
    let unitPrice = DEFAULT_PRICES[serviceSlug] || 500;

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
        guest_stay_id: guestStayId || null,
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
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deptId = searchParams.get('departmentId');
    const statusId = searchParams.get('statusId');

    let query = supabaseServer
      .from('service_requests')
      .select('*, status:order_statuses(id, name), department:departments(id, name), service:resort_services(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (deptId) {
      query = query.eq('department_id', Number(deptId));
    }
    if (statusId) {
      query = query.eq('status_id', Number(statusId));
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, requests: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
