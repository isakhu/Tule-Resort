'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  X,
  RefreshCw,
  Building2,
  Calendar,
  Sparkles,
  Utensils,
  Dumbbell,
  Waves,
  Filter,
  User,
  ArrowRight
} from 'lucide-react';
import supabase from '@/lib/supabaseClient';

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
  elapsedMinutes: number;
  notes?: string | null;
}

export default function DepartmentQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'accepted' | 'in_progress' | 'ready' | 'completed'>('active');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [userDepts, setUserDepts] = useState<{ id: number; name: string }[]>([]);
  const [userRole, setUserRole] = useState<string>('staff');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting'>('live');

  // 1. Fetch user permissions and departments
  const loadUserContext = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/staff/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setUserRole(json.profile?.role || 'staff');

        const deptNames = json.profile?.departmentNames || [];
        const deptIds = json.profile?.departmentIds || [];
        const combined = deptIds.map((id: number, idx: number) => ({
          id,
          name: deptNames[idx] || `Department ${id}`,
        }));
        setUserDepts(combined);
      }
    } catch {
      // fallback
    }
  }, []);

  // 2. Fetch live queue items (both orders and service_requests)
  const fetchQueue = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) {
      setLoading(true);
      setErrorMsg(null);
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      // Parallel fetch: department orders & service requests
      const [ordersRes, requestsRes] = await Promise.all([
        fetch('/api/orders/department', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        }),
        fetch('/api/service-requests', { cache: 'no-store' }),
      ]);

      const queueList: QueueItem[] = [];

      // Process food orders
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        const orders = json.orders || [];

        // For orders with items, query order items relational details
        if (orders.length > 0) {
          const orderIds = orders.map((o: any) => o.id);
          const { data: orderItemsData } = await supabase
            .from('order_items')
            .select('order_id, quantity, price, menu_item:menu_items(name, category)')
            .in('order_id', orderIds);

          const itemsByOrderId = new Map<string, any[]>();
          (orderItemsData || []).forEach((it) => {
            const arr = itemsByOrderId.get(it.order_id) || [];
            arr.push(it);
            itemsByOrderId.set(it.order_id, arr);
          });

          // Fetch status names map
          const { data: statuses } = await supabase.from('order_statuses').select('id, name');
          const statusMap = new Map((statuses || []).map((s) => [s.id, s.name]));

          // Fetch dining tables for table labels
          const { data: tables } = await supabase.from('dining_tables').select('id, table_number');
          const tableMap = new Map((tables || []).map((t) => [t.id, t.table_number]));

          // Fetch departments
          const { data: depts } = await supabase.from('departments').select('id, name');
          const deptMap = new Map((depts || []).map((d) => [d.id, d.name]));

          orders.forEach((o: any) => {
            const rawStatus = (statusMap.get(o.status_id) || 'Pending').toLowerCase();
            let step: QueueItem['statusStep'] = 'pending';
            if (rawStatus.includes('cancel')) step = 'cancelled';
            else if (rawStatus.includes('complete')) step = 'completed';
            else if (rawStatus.includes('ready')) step = 'ready';
            else if (rawStatus.includes('prep') || rawStatus.includes('progress')) step = 'in_progress';
            else if (rawStatus.includes('accept') || rawStatus.includes('confirm')) step = 'accepted';
            else step = 'pending';

            const createdMs = o.created_at ? new Date(o.created_at).getTime() : Date.now();
            const elapsed = Math.max(0, Math.round((Date.now() - createdMs) / 60000));

            const childItems = itemsByOrderId.get(o.id) || [];
            const details = childItems.map((ci) => ({
              name: ci.menu_item?.name || 'Dish Item',
              quantity: ci.quantity || 1,
              notes: ci.menu_item?.category,
            }));

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
              departmentName: deptMap.get(o.department_id) || 'Kitchen / Restaurant',
              guestName: o.guest_name || 'Guest',
              roomOrTable,
              phone: null,
              dateOrTime: o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
              details,
              price: Number(o.total || 0),
              statusId: o.status_id || 1,
              statusName: statusMap.get(o.status_id) || 'Pending',
              statusStep: step,
              elapsedMinutes: elapsed,
              notes: o.notes,
            });
          });
        }
      }

      // Process wellness / service requests
      if (requestsRes.ok) {
        const json = await requestsRes.json();
        const reqs = json.requests || [];

        reqs.forEach((r: any) => {
          const rawStatus = (r.status?.name || 'Pending').toLowerCase();
          let step: QueueItem['statusStep'] = 'pending';
          if (rawStatus.includes('cancel')) step = 'cancelled';
          else if (rawStatus.includes('complete')) step = 'completed';
          else if (rawStatus.includes('ready')) step = 'ready';
          else if (rawStatus.includes('progress') || rawStatus.includes('prep')) step = 'in_progress';
          else if (rawStatus.includes('accept') || rawStatus.includes('confirm')) step = 'accepted';
          else step = 'pending';

          const createdMs = r.created_at ? new Date(r.created_at).getTime() : Date.now();
          const elapsed = Math.max(0, Math.round((Date.now() - createdMs) / 60000));

          queueList.push({
            id: r.id,
            entityType: 'service_request',
            displayNumber: `REQ-${String(r.id).slice(-4).toUpperCase()}`,
            title: r.service?.name ? `${r.service.name} Request` : `${r.department?.name || 'Resort'} Service`,
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
            statusId: r.status_id || 1,
            statusName: r.status?.name || 'Pending',
            statusStep: step,
            elapsedMinutes: elapsed,
            notes: r.notes,
          });
        });
      }

      // Sort by newest active first
      queueList.sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);
      setItems(queueList);
    } catch (err: any) {
      if (!isSilent) {
        setErrorMsg('Failed to load department queue items.');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUserContext();
    fetchQueue();

    // 15-second background polling resilience interval for tablet wakeups & missed websockets
    const pollInterval = setInterval(() => {
      fetchQueue(true);
    }, 15000);

    // Immediate sync on reconnection or tab visibility change
    const handleOnline = () => {
      setConnectionStatus('live');
      fetchQueue(true);
    };
    const handleOffline = () => {
      setConnectionStatus('reconnecting');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchQueue(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Realtime subscriptions
    const orderChannel = supabase
      .channel('queue:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchQueue(true);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => {
        fetchQueue(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('live');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
        }
      });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(reqChannel);
    };
  }, [loadUserContext, fetchQueue]);

  // Transition handler using shared update_entity_status RPC with optimistic locking
  const handleTransition = async (item: QueueItem, nextStatusId: number, nextStepName: string) => {
    setUpdatingId(item.id);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.rpc('update_entity_status', {
        p_entity_type: item.entityType,
        p_entity_id: item.id,
        p_to_status_id: nextStatusId,
        p_notes: `Transitioned to ${nextStepName} via Department Queue`,
        p_expected_status_id: item.statusId,
      });

      if (error) {
        if (error.message && error.message.includes('STATE_CONFLICT')) {
          setErrorMsg('Conflict: Item status was modified by another staff member or guest. Queue refreshed.');
        } else {
          setErrorMsg(error.message || `Could not transition item to ${nextStepName}.`);
        }
        fetchQueue();
      } else {
        // Optimistic local state update
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, statusId: nextStatusId, statusName: nextStepName } : it))
        );
        fetchQueue();
      }
    } catch {
      setErrorMsg('Connection error during status update.');
      fetchQueue();
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Department filter
      if (deptFilter !== 'All' && it.departmentName !== deptFilter) {
        return false;
      }
      // Status tab filter
      if (activeTab === 'active') {
        return it.statusStep !== 'completed' && it.statusStep !== 'cancelled';
      }
      return it.statusStep === activeTab;
    });
  }, [items, deptFilter, activeTab]);

  const counts = useMemo(() => {
    return {
      active: items.filter((i) => i.statusStep !== 'completed' && i.statusStep !== 'cancelled').length,
      pending: items.filter((i) => i.statusStep === 'pending').length,
      accepted: items.filter((i) => i.statusStep === 'accepted').length,
      in_progress: items.filter((i) => i.statusStep === 'in_progress').length,
      ready: items.filter((i) => i.statusStep === 'ready').length,
      completed: items.filter((i) => i.statusStep === 'completed').length,
    };
  }, [items]);

  const uniqueDepts = useMemo(() => {
    const set = new Set(items.map((i) => i.departmentName));
    return Array.from(set);
  }, [items]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Department Queue</h1>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                connectionStatus === 'live'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
              }`}
              title={
                connectionStatus === 'live'
                  ? 'Realtime WebSocket active'
                  : 'Realtime disconnected or reconnecting. 15-second background polling active.'
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'live' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{connectionStatus === 'live' ? 'Live Queue' : 'Reconnecting (Polling Active)'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Accept, track, and complete live food orders and wellness service requests across all resort stations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {uniqueDepts.length > 1 && (
            <div className="relative">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none rounded-xl border border-gray-300 bg-white py-2 pl-3.5 pr-8 text-xs font-bold text-gray-700 shadow-xs focus:ring-2 focus:ring-[#0E7480] outline-none"
              >
                <option value="All">All Departments</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>
          )}

          <button
            onClick={() => fetchQueue()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl shadow-xs hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#0E7480] ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-xs font-semibold">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── STATUS STAGES TABS ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'active'
              ? 'bg-[#0B252C] text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>All Active</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{counts.active}</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>1. Pending (Needs Accept)</span>
          <span className="rounded-full bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[10px]">{counts.pending}</span>
        </button>

        <button
          onClick={() => setActiveTab('accepted')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'accepted'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>2. Accepted</span>
          <span className="rounded-full bg-blue-100 text-blue-900 px-1.5 py-0.2 text-[10px]">{counts.accepted}</span>
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'in_progress'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>3. In Progress</span>
          <span className="rounded-full bg-purple-100 text-purple-900 px-1.5 py-0.2 text-[10px]">{counts.in_progress}</span>
        </button>

        <button
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'ready'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>4. Ready</span>
          <span className="rounded-full bg-teal-100 text-teal-900 px-1.5 py-0.2 text-[10px]">{counts.ready}</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>5. Completed</span>
          <span className="rounded-full bg-emerald-100 text-emerald-900 px-1.5 py-0.2 text-[10px]">{counts.completed}</span>
        </button>
      </div>

      {/* ─── QUEUE CARDS GRID ─── */}
      {loading ? (
        <div className="p-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-[#0E7480]" />
          <p className="text-xs font-semibold">Loading live queue...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-base font-bold text-gray-800">Queue is Clear</p>
          <p className="text-xs text-gray-400 mt-1">No items found for current department and filter tab.</p>
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
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-[#0B252C] bg-gray-100 px-2.5 py-1 rounded-lg">
                        {item.displayNumber}
                      </span>
                      <span className="text-xs font-bold text-[#0E7480] bg-[#0E7480]/10 px-2 py-0.5 rounded-md">
                        {item.roomOrTable}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        item.elapsedMinutes > 30
                          ? 'bg-red-100 text-red-700 animate-pulse'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {item.elapsedMinutes}m ago
                    </span>
                  </div>

                  {/* Department & Guest info */}
                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-gray-600">
                      <Building2 className="h-3.5 w-3.5 text-[#0E7480]" /> {item.departmentName}
                    </span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400" /> {item.guestName}
                    </span>
                  </div>

                  {/* Title & Items List */}
                  <div className="mt-1 space-y-2">
                    <p className="text-sm font-extrabold text-gray-900">{item.title}</p>
                    <div className="space-y-1.5 bg-gray-50/75 p-2.5 rounded-xl border border-gray-100">
                      {item.details.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">{d.name}</span>
                          <span className="font-bold text-[#C9902F]">×{d.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {item.notes && (
                    <p className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg font-medium">
                      Note: {item.notes}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-bold">
                    <span className="text-gray-400">Total Price</span>
                    <span className="text-emerald-700 text-sm">{item.price.toLocaleString()} ETB</span>
                  </div>
                </div>

                {/* Card Action Pipeline Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                  {/* Step 1: Pending -> Accept */}
                  {isPending && (
                    <>
                      <button
                        disabled={isBusy}
                        onClick={() => handleTransition(item, 7, 'Accepted')} // 7 = Accepted
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept Request
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => handleTransition(item, 9, 'Cancelled')} // 9 = Cancelled
                        className="py-2 px-3 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        title="Decline / Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  {/* Step 2: Accepted -> In Progress */}
                  {isAccepted && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleTransition(item, 8, 'In Progress')} // 8 = In Progress (or 3 Preparing)
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" /> Start Service / Prep
                    </button>
                  )}

                  {/* Step 3: In Progress -> Ready */}
                  {isInProgress && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleTransition(item, 4, 'Ready')} // 4 = Ready
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready
                    </button>
                  )}

                  {/* Step 4: Ready -> Completed */}
                  {isReady && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleTransition(item, 6, 'Completed')} // 6 = Completed
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark Completed & Fulfilled
                    </button>
                  )}

                  {/* Completed */}
                  {isCompleted && (
                    <div className="w-full py-1 text-center text-xs font-extrabold text-emerald-700 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Fulfilled & Closed
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
