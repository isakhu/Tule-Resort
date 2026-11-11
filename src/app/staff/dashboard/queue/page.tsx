'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Play,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';
import {
  isAcceptedOrConfirmedStatus,
  isCancelledStatus,
  isCompletedStatus,
  isDeliveredStatus,
  isPreparingOrInProgressStatus,
  isReadyStatus,
  ORDER_STATUS_ID,
} from '@/lib/orderStatuses';

interface QueueItem {
  id: string;
  entityType: 'order' | 'service_request';
  displayNumber: string;
  title: string;
  departmentId: number;
  departmentName: string;
  guestName: string;
  roomOrTable: string;
  phone?: string | null;
  dateOrTime: string;
  details: { name: string; quantity: number; notes?: string }[];
  price: number;
  statusId: number;
  statusName: string;
  statusStep: 'pending' | 'accepted' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
  createdAtMs: number;
  elapsedMinutes: number;
  notes?: string | null;
}

interface DepartmentOrderRow {
  id: string;
  department_id?: number | null;
  dining_table_id?: string | null;
  guest_name?: string | null;
  room_number?: string | null;
  notes?: string | null;
  total?: number | string | null;
  status_id?: number | null;
  created_at?: string | null;
}

interface OrderItemLookupRow {
  order_id: string;
  quantity?: number | null;
  menu_item?:
    | { name?: string | null; category?: string | null }
    | Array<{ name?: string | null; category?: string | null }>
    | null;
}

interface ServiceRequestApiRow {
  id: string;
  department_id: number;
  requested_date: string;
  requested_time?: string | null;
  party_size?: number | null;
  guest_name: string;
  guest_phone?: string | null;
  room_number?: string | null;
  notes?: string | null;
  price?: number | string | null;
  status_id?: number | null;
  created_at?: string | null;
  status?: { id?: number; name?: string | null } | null;
  department?: { id?: number; name?: string | null } | null;
  service?: { name?: string | null } | null;
}

function mapStatusToQueueStep(
  statusId?: number | null,
  statusName?: string | null
): QueueItem['statusStep'] {
  if (isCancelledStatus(statusId, statusName)) return 'cancelled';
  if (isCompletedStatus(statusId, statusName) || isDeliveredStatus(statusId, statusName)) {
    return 'completed';
  }
  if (isReadyStatus(statusId, statusName)) return 'ready';
  if (isPreparingOrInProgressStatus(statusId, statusName)) return 'in_progress';
  if (isAcceptedOrConfirmedStatus(statusId, statusName)) return 'accepted';
  return 'pending';
}

export default function DepartmentQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'active' | 'pending' | 'accepted' | 'in_progress' | 'ready' | 'completed'
  >('active');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [userDepts, setUserDepts] = useState<{ id: number; name: string }[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting'>('live');

  const lookupsLoadedRef = useRef(false);
  const statusMapRef = useRef<Map<number, string>>(new Map());
  const tableMapRef = useRef<Map<string, string>>(new Map());
  const deptMapRef = useRef<Map<number, string>>(new Map());
  const inFlightRef = useRef(false);

  const ensureLookupCaches = useCallback(async () => {
    if (lookupsLoadedRef.current) return;
    const [statusRes, tableRes, deptRes] = await Promise.all([
      supabase.from('order_statuses').select('id, name'),
      supabase.from('dining_tables').select('id, table_number'),
      supabase.from('departments').select('id, name'),
    ]);
    statusMapRef.current = new Map((statusRes.data || []).map((s) => [s.id, s.name]));
    tableMapRef.current = new Map((tableRes.data || []).map((t) => [t.id, t.table_number]));
    deptMapRef.current = new Map((deptRes.data || []).map((d) => [d.id, d.name]));
    lookupsLoadedRef.current = true;
  }, []);

  const selectedDepartmentId = useMemo(() => {
    if (deptFilter === 'All') return undefined;
    const fromUser = userDepts.find((d) => d.name === deptFilter);
    if (fromUser) return fromUser.id;
    const fromItems = items.find((i) => i.departmentName === deptFilter);
    if (fromItems) return fromItems.departmentId;
    return undefined;
  }, [deptFilter, userDepts, items]);

  const fetchQueue = useCallback(
    async (isSilent: boolean = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (!isSilent) {
        setErrorMsg(null);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
        const serviceRequestsUrl = selectedDepartmentId
          ? `/api/service-requests?departmentId=${encodeURIComponent(String(selectedDepartmentId))}`
          : '/api/service-requests';

        const [ordersRes, requestsRes] = await Promise.all([
          fetch('/api/orders/department', {
            headers: authHeaders,
            cache: 'no-store',
          }),
          fetch(serviceRequestsUrl, {
            headers: authHeaders,
            cache: 'no-store',
          }),
        ]);

        const queueList: QueueItem[] = [];
        const fetchErrors: string[] = [];

        if (ordersRes.ok) {
          const json = (await ordersRes.json()) as { orders?: DepartmentOrderRow[] };
          const orders = json.orders || [];

          if (orders.length > 0) {
            await ensureLookupCaches();

            const orderIds = Array.from(new Set(orders.map((o) => o.id)));
            const { data: orderItemsData } = await supabase
              .from('order_items')
              .select('order_id, quantity, price, menu_item:menu_items(name, category)')
              .in('order_id', orderIds);

            const itemsByOrderId = new Map<string, OrderItemLookupRow[]>();
            ((orderItemsData || []) as OrderItemLookupRow[]).forEach((it) => {
              const arr = itemsByOrderId.get(it.order_id) || [];
              arr.push(it);
              itemsByOrderId.set(it.order_id, arr);
            });

            const statusMap = statusMapRef.current;
            const tableMap = tableMapRef.current;
            const deptMap = deptMapRef.current;

            orders.forEach((o) => {
              const statusName = statusMap.get(o.status_id ?? 1) || 'Pending';
              const step = mapStatusToQueueStep(o.status_id, statusName);
              const parsedMs = o.created_at ? new Date(o.created_at).getTime() : NaN;
              const createdAtMs = Number.isFinite(parsedMs) ? parsedMs : Date.now();
              const elapsed = Math.max(0, Math.round((Date.now() - createdAtMs) / 60000));

              const childItems = itemsByOrderId.get(o.id) || [];
              const details = childItems.map((ci) => {
                const mi = Array.isArray(ci.menu_item) ? ci.menu_item[0] : ci.menu_item;
                return {
                  name: mi?.name || 'Dish Item',
                  quantity: Number(ci.quantity) || 1,
                  notes: mi?.category || undefined,
                };
              });

              const tableNum = o.dining_table_id ? tableMap.get(o.dining_table_id) : null;
              const roomOrTable = tableNum
                ? tableNum
                : o.room_number
                ? `Room ${o.room_number}`
                : o.guest_name || 'Dine-In';

              queueList.push({
                id: o.id,
                entityType: 'order',
                displayNumber: `ORD-${String(o.id).slice(-4).toUpperCase()}`,
                title: `Food & Dining Order (${details.length} items)`,
                departmentId: o.department_id || 1,
                departmentName: deptMap.get(o.department_id ?? 1) || 'Kitchen / Restaurant',
                guestName: o.guest_name || 'Guest',
                roomOrTable,
                phone: null,
                dateOrTime: o.created_at
                  ? new Date(o.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Now',
                details,
                price: Number(o.total || 0),
                statusId: o.status_id || ORDER_STATUS_ID.PENDING,
                statusName,
                statusStep: step,
                createdAtMs,
                elapsedMinutes: elapsed,
                notes: o.notes,
              });
            });
          }
        } else {
          const errPayload = (await ordersRes.json().catch(() => null)) as { error?: string } | null;
          fetchErrors.push(errPayload?.error || `Orders feed returned ${ordersRes.status}`);
        }

        if (requestsRes.ok) {
          const json = (await requestsRes.json()) as { requests?: ServiceRequestApiRow[] };
          const reqs = json.requests || [];

          reqs.forEach((r) => {
            const statusName = r.status?.name || 'Pending';
            const step = mapStatusToQueueStep(r.status_id, statusName);
            const parsedMs = r.created_at ? new Date(r.created_at).getTime() : NaN;
            const createdAtMs = Number.isFinite(parsedMs) ? parsedMs : Date.now();
            const elapsed = Math.max(0, Math.round((Date.now() - createdAtMs) / 60000));

            queueList.push({
              id: r.id,
              entityType: 'service_request',
              displayNumber: `REQ-${String(r.id).slice(-4).toUpperCase()}`,
              title: r.service?.name
                ? `${r.service.name} Request`
                : `${r.department?.name || 'Resort'} Service`,
              departmentId: r.department_id,
              departmentName: r.department?.name || 'Resort Service',
              guestName: r.guest_name,
              roomOrTable: r.room_number ? `Room ${r.room_number}` : 'Guest Direct',
              phone: r.guest_phone,
              dateOrTime: `${r.requested_date}${r.requested_time ? ' @ ' + r.requested_time : ''}`,
              details: [
                {
                  name: r.service?.name || r.department?.name || 'Service Booking',
                  quantity: r.party_size || 1,
                  notes: r.requested_time ? `Time: ${r.requested_time}` : undefined,
                },
              ],
              price: Number(r.price || 0),
              statusId: r.status_id || ORDER_STATUS_ID.PENDING,
              statusName,
              statusStep: step,
              createdAtMs,
              elapsedMinutes: elapsed,
              notes: r.notes,
            });
          });
        } else {
          const errPayload = (await requestsRes.json().catch(() => null)) as { error?: string } | null;
          fetchErrors.push(errPayload?.error || `Service requests feed returned ${requestsRes.status}`);
        }

        const deduped = Array.from(
          new Map(queueList.map((item) => [`${item.entityType}:${item.id}`, item])).values()
        );
        deduped.sort((a, b) => a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id));

        if (queueList.length > 0 || fetchErrors.length < 2) {
          setItems(deduped);
        }
        if (fetchErrors.length > 0 && !isSilent) {
          setErrorMsg(fetchErrors.join(' · '));
        }
      } catch {
        if (!isSilent) {
          setErrorMsg('Failed to load department queue items.');
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [ensureLookupCaches, selectedDepartmentId]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token && mounted) {
          const res = await fetch('/api/staff/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok && mounted) {
            const json = await res.json();
            const deptNames: string[] = json.profile?.departmentNames || [];
            const deptIds: number[] = json.profile?.departmentIds || [];
            const combined = deptIds.map((id: number, idx: number) => ({
              id,
              name: deptNames[idx] || `Department ${id}`,
            }));
            setUserDepts(combined);
          }
        }
      } catch {
        // Ignore profile preload failure
      }
      if (mounted) {
        void fetchQueue(true);
      }
    })();

    const pollInterval = setInterval(() => {
      void fetchQueue(true);
    }, 15000);

    const handleOnline = () => {
      setConnectionStatus('live');
      void fetchQueue(true);
    };
    const handleOffline = () => {
      setConnectionStatus('reconnecting');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchQueue(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const orderChannel = supabase
      .channel('queue:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchQueue(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('live');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
        }
      });

    const reqChannel = supabase
      .channel('queue:service_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        () => {
          void fetchQueue(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('live');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
        }
      });

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(reqChannel);
    };
  }, [fetchQueue]);

  const handleTransition = async (
    item: QueueItem,
    nextStatusId: number,
    nextStepName: string
  ) => {
    if (updatingId === item.id) return;
    setUpdatingId(item.id);
    setErrorMsg(null);

    try {
      const { error } = await supabase.rpc('update_entity_status', {
        p_entity_type: item.entityType,
        p_entity_id: item.id,
        p_to_status_id: nextStatusId,
        p_notes: `Transitioned to ${nextStepName} via Department Queue`,
        p_expected_status_id: item.statusId,
      });

      if (error) {
        if (error.message && error.message.includes('STATE_CONFLICT')) {
          setErrorMsg(
            'Conflict: Item status was modified by another staff member or guest. Queue refreshed.'
          );
        } else {
          setErrorMsg(error.message || `Could not transition item to ${nextStepName}.`);
        }
      } else {
        const nextStep = mapStatusToQueueStep(nextStatusId, nextStepName);
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id && it.entityType === item.entityType
              ? { ...it, statusId: nextStatusId, statusName: nextStepName, statusStep: nextStep }
              : it
          )
        );
      }
      await fetchQueue(true);
    } catch {
      setErrorMsg('Connection error during status update.');
      await fetchQueue(true);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    const filtered = items.filter((it) => {
      if (deptFilter !== 'All' && it.departmentName !== deptFilter) {
        return false;
      }
      if (activeTab === 'active') {
        return it.statusStep !== 'completed' && it.statusStep !== 'cancelled';
      }
      return it.statusStep === activeTab;
    });

    if (activeTab === 'completed') {
      return [...filtered].sort((a, b) => b.createdAtMs - a.createdAtMs || a.id.localeCompare(b.id));
    }
    return filtered;
  }, [items, deptFilter, activeTab]);

  const counts = useMemo(() => {
    const scoped =
      deptFilter === 'All' ? items : items.filter((i) => i.departmentName === deptFilter);
    return {
      active: scoped.filter(
        (i) => i.statusStep !== 'completed' && i.statusStep !== 'cancelled'
      ).length,
      pending: scoped.filter((i) => i.statusStep === 'pending').length,
      accepted: scoped.filter((i) => i.statusStep === 'accepted').length,
      in_progress: scoped.filter((i) => i.statusStep === 'in_progress').length,
      ready: scoped.filter((i) => i.statusStep === 'ready').length,
      completed: scoped.filter((i) => i.statusStep === 'completed').length,
    };
  }, [items, deptFilter]);

  const uniqueDepts = useMemo(() => {
    const set = new Set<string>([
      ...userDepts.map((d) => d.name),
      ...items.map((i) => i.departmentName),
    ]);
    return Array.from(set).filter(Boolean).sort();
  }, [items, userDepts]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E6DFD1] pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#7A5A27]">
            Operations Board
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#163D32] tracking-tight">
              Department Queue
            </h1>
            <div
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                connectionStatus === 'live'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
              }`}
              title={
                connectionStatus === 'live'
                  ? 'Realtime WebSocket active'
                  : 'Realtime disconnected or reconnecting. 15-second background polling active.'
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'live' ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              />
              <span>{connectionStatus === 'live' ? 'Live Queue' : 'Reconnecting (Polling)'}</span>
            </div>
          </div>
          <p className="text-xs text-[#52645D] mt-1">
            Accept, track, and complete live food orders and wellness service requests across all
            resort stations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {uniqueDepts.length > 1 && (
            <div className="relative">
              <select
                aria-label="Filter queue by department"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none rounded-xl border border-[#D5CCB9] bg-white py-2 pl-3.5 pr-8 text-xs font-bold text-[#163D32] shadow-xs focus:border-[#163D32] focus:ring-2 focus:ring-[#C5A46D]/30 outline-none"
              >
                <option value="All">All Departments</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Filter
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7A5A27]"
                aria-hidden="true"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchQueue()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#163D32] bg-white border border-[#D5CCB9] rounded-xl shadow-xs hover:bg-[#F5F0E6] transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#7A5A27] ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />{' '}
            Refresh
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-900 text-xs font-semibold"
        >
          <span className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-700 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setErrorMsg(null)}
            className="rounded-lg p-1 text-red-700 hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ─── STATUS STAGES TABS ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'active'
              ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
              : 'bg-white text-[#52645D] border border-[#E6DFD1] hover:bg-[#EDE6D8]'
          }`}
        >
          <span>All Active</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              activeTab === 'active' ? 'bg-[#C5A46D]/25 text-[#F5F0E6]' : 'bg-[#F5F0E6] text-[#163D32]'
            }`}
          >
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'pending'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-white text-[#52645D] border border-[#E6DFD1] hover:bg-[#EDE6D8]'
          }`}
        >
          <span>1. Pending (Needs Accept)</span>
          <span className="rounded-full bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px]">
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accepted')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'accepted'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-[#52645D] border border-[#E6DFD1] hover:bg-[#EDE6D8]'
          }`}
        >
          <span>2. Accepted</span>
          <span className="rounded-full bg-blue-100 text-blue-900 px-1.5 py-0.5 text-[10px]">
            {counts.accepted}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('in_progress')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'in_progress'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-[#52645D] border border-[#E6DFD1] hover:bg-[#EDE6D8]'
          }`}
        >
          <span>3. In Progress</span>
          <span className="rounded-full bg-purple-100 text-purple-900 px-1.5 py-0.5 text-[10px]">
            {counts.in_progress}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'ready'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'bg-white text-[#52645D] border border-[#E6DFD1] hover:bg-[#EDE6D8]'
          }`}
        >
          <span>4. Ready</span>
          <span className="rounded-full bg-sky-100 text-sky-900 px-1.5 py-0.5 text-[10px]">
            {counts.ready}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-[#52645D] border border-[#E6DFD1] hover:bg-[#EDE6D8]'
          }`}
        >
          <span>5. Completed</span>
          <span className="rounded-full bg-emerald-100 text-emerald-900 px-1.5 py-0.5 text-[10px]">
            {counts.completed}
          </span>
        </button>
      </div>

      {/* ─── QUEUE CARDS GRID ─── */}
      {loading ? (
        <div className="p-16 text-center text-[#52645D] bg-white rounded-2xl border border-[#E6DFD1] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-[#7A5A27]" aria-hidden="true" />
          <p className="text-xs font-semibold">Loading live queue...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-[#52645D] bg-white rounded-2xl border border-[#E6DFD1]">
          <CheckCircle2
            className="h-10 w-10 text-[#C5A46D] mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="font-display text-lg font-semibold text-[#163D32]">Queue is Clear</p>
          <p className="text-xs text-[#52645D] mt-1">
            No items found for current department and filter tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isPending = item.statusStep === 'pending';
            const isAccepted = item.statusStep === 'accepted';
            const isInProgress = item.statusStep === 'in_progress';
            const isReady = item.statusStep === 'ready';
            const isCompleted = item.statusStep === 'completed';
            const isBusy = updatingId === item.id;

            return (
              <div
                key={`${item.entityType}:${item.id}`}
                className="bg-white rounded-2xl border border-[#E6DFD1] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD1]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#163D32] bg-[#F5F0E6] border border-[#E6DFD1] px-2.5 py-1 rounded-lg">
                        {item.displayNumber}
                      </span>
                      <span className="text-xs font-bold text-[#7A5A27] bg-[#F5F0E6] px-2 py-0.5 rounded-md">
                        {item.roomOrTable}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.elapsedMinutes > 30
                          ? 'bg-red-100 text-red-800 animate-pulse'
                          : 'bg-[#F5F0E6] text-[#52645D]'
                      }`}
                    >
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {item.elapsedMinutes}m ago
                    </span>
                  </div>

                  {/* Department & Guest info */}
                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#52645D]">
                      <Building2 className="h-3.5 w-3.5 text-[#7A5A27]" aria-hidden="true" />{' '}
                      {item.departmentName}
                    </span>
                    <span className="font-bold text-[#163D32] flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-[#7A5A27]" aria-hidden="true" />{' '}
                      {item.guestName}
                    </span>
                  </div>

                  {/* Title & Items List */}
                  <div className="mt-1 space-y-2">
                    <p className="text-sm font-bold text-[#163D32]">{item.title}</p>
                    <div className="space-y-1.5 bg-[#F5F0E6]/65 p-2.5 rounded-xl border border-[#E6DFD1]">
                      {item.details.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-[#163D32] font-medium">{d.name}</span>
                          <span className="font-bold text-[#7A5A27]">×{d.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {item.notes && (
                    <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-lg font-medium">
                      Note: {item.notes}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E6DFD1] text-xs font-bold">
                    <span className="text-[#52645D]">Total Price</span>
                    <span className="text-[#163D32] text-sm">
                      {item.price.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* Card Action Pipeline Footer */}
                <div className="p-3 bg-[#F5F0E6]/75 border-t border-[#E6DFD1] flex items-center gap-2">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTransition(item, 7, 'Accepted')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Accept Request
                      </button>
                      <button
                        type="button"
                        aria-label={`Decline and cancel ${item.displayNumber}`}
                        disabled={isBusy}
                        onClick={() => handleTransition(item, 9, 'Cancelled')}
                        className="py-2 px-3 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        title="Decline / Cancel"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  )}

                  {isAccepted && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleTransition(item, 8, 'In Progress')}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start Service / Prep
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleTransition(item, 4, 'Ready')}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-[#F5F0E6] bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#C5A46D]" aria-hidden="true" />{' '}
                      Mark Ready
                    </button>
                  )}

                  {isReady && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleTransition(item, 6, 'Completed')}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark Completed &amp;
                      Fulfilled
                    </button>
                  )}

                  {isCompleted && (
                    <div className="w-full py-1 text-center text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />{' '}
                      Fulfilled &amp; Closed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
