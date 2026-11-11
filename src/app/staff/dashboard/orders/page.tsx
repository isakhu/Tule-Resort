'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Clock,
  Filter,
  Layers,
  MoreVertical,
  Plus,
  RefreshCw,
  Utensils,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { updateOrderStatus, type OrderStatus } from '@/lib/orders';
import { getDiningTables, DiningTable } from '@/lib/diningTables';
import {
  classifyOrderBucket,
  formatOrderLocationLabel,
  getCanonicalOrderStatusLabel,
  ORDER_STATUS_ID,
  type OrderDisplayBucket,
} from '@/lib/orderStatuses';

interface OrderItemDisplay {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface OrderDisplay {
  id: string;
  orderNumber: string;
  tableLabel: string;
  section?: string | null;
  guestCount: number;
  orderType: 'Dine-in' | 'Takeaway' | 'Room Service';
  items: OrderItemDisplay[];
  status: OrderDisplayBucket;
  statusId: number;
  statusLabel: string;
  elapsedMinutes: number;
  placedTime: string;
  total: number;
}

interface StaffOrderRow {
  id: string;
  created_at?: string | null;
  status_id?: number | null;
  room_number?: string | null;
  guest_name?: string | null;
  total?: number | string | null;
  status?: { id?: number; name?: string | null } | Array<{ id?: number; name?: string | null }> | null;
  dining_table?:
    | { table_number?: string | null; section?: string | null; capacity?: number | null }
    | Array<{ table_number?: string | null; section?: string | null; capacity?: number | null }>
    | null;
  table_session?:
    | { party_size?: number | null }
    | Array<{ party_size?: number | null }>
    | null;
  items?: Array<{
    id?: string;
    quantity?: number | null;
    price?: number | null;
    menu_item?:
      | { name?: string | null; image_url?: string | null }
      | Array<{ name?: string | null; image_url?: string | null }>
      | null;
  }> | null;
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function StaffOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'ready' | 'delayed'>('all');
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [actionMenuOrderId, setActionMenuOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [orders, setOrders] = useState<OrderDisplay[]>([]);

  async function loadOrdersFromDb(silent = false) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          status:order_statuses(id,name),
          dining_table:dining_tables(table_number,section,capacity),
          table_session:table_sessions(party_size),
          items:order_items(id,menu_item_id,quantity,price,menu_item:menu_items(name,image_url))
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (!silent) {
          setFeedback({ type: 'error', text: `Failed to load orders: ${error.message}` });
        }
        return;
      }

      if (!data || data.length === 0) {
        setOrders([]);
        return;
      }

      const mapped: OrderDisplay[] = (data as StaffOrderRow[]).map((row) => {
        const createdMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
        const elapsedMinutes = Math.max(0, Math.round((Date.now() - createdMs) / 60000));
        const st = unwrapSingle(row.status);
        const dt = unwrapSingle(row.dining_table);
        const session = unwrapSingle(row.table_session);
        const statusId = Number(row.status_id ?? st?.id ?? ORDER_STATUS_ID.PENDING);

        const bucket = classifyOrderBucket(statusId, st?.name, row.created_at, 35);
        const statusLabel = getCanonicalOrderStatusLabel(statusId, st?.name);

        const tableLabel = formatOrderLocationLabel({
          tableNumber: dt?.table_number,
          roomNumber: row.room_number,
          guestName: row.guest_name,
          fallback: 'Table Order',
        });

        const items: OrderItemDisplay[] = (row.items || []).map((it) => {
          const mi = unwrapSingle(it.menu_item);
          return {
            name: mi?.name || 'Dish Item',
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            imageUrl: mi?.image_url || undefined,
          };
        });

        return {
          id: row.id,
          orderNumber: `#${String(row.id).slice(-4).toUpperCase()}`,
          tableLabel,
          section: dt?.section ?? null,
          guestCount: Number(session?.party_size ?? dt?.capacity ?? 2),
          orderType: row.room_number ? 'Room Service' : 'Dine-in',
          items,
          status: bucket,
          statusId,
          statusLabel,
          elapsedMinutes,
          placedTime: row.created_at
            ? new Date(row.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Just now',
          total: Number(row.total || 0),
        };
      });

      setOrders(mapped);
    } catch {
      if (!silent) {
        setFeedback({ type: 'error', text: 'Connection error refreshing orders.' });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getDiningTables()
      .then(setTables)
      .catch((err) => console.warn('Could not load dining tables:', err));
    void Promise.resolve().then(() => loadOrdersFromDb(true));

    const channel = supabase
      .channel('staff:orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadOrdersFromDb(true);
      })
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!actionMenuOrderId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActionMenuOrderId(null);
      }
    };

    const handleClickOutside = () => {
      setActionMenuOrderId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [actionMenuOrderId]);

  const handleStatusChange = async (
    order: OrderDisplay,
    targetStatus: OrderStatus,
    displayLabel: string
  ) => {
    if (updatingOrderId === order.id) return;
    setActionMenuOrderId(null);
    setUpdatingOrderId(order.id);
    setFeedback(null);

    try {
      const res = await updateOrderStatus(
        order.id,
        targetStatus,
        `Updated to ${displayLabel} from Live Orders`,
        order.statusId
      );

      if (!res.success) {
        setFeedback({
          type: 'error',
          text: res.isConflict
            ? `Conflict updating ${order.orderNumber}: order changed elsewhere. List refreshed.`
            : res.error || `Could not update ${order.orderNumber} to ${displayLabel}.`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Order ${order.orderNumber} updated to ${displayLabel}.`,
        });
      }

      await loadOrdersFromDb(true);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'pending' && o.status !== 'Pending' && o.status !== 'Accepted') {
      return false;
    }
    if (activeFilter === 'in_progress' && o.status !== 'In Progress') return false;
    if (activeFilter === 'ready' && o.status !== 'Ready') return false;
    if (activeFilter === 'delayed' && o.status !== 'Delayed') return false;

    if (selectedArea !== 'All Areas') {
      if (selectedArea === 'Room Service' && o.orderType !== 'Room Service') return false;
      if (
        selectedArea === 'Floor 1' &&
        o.section !== 'Floor 1' &&
        !o.tableLabel.toLowerCase().includes('table')
      ) {
        return false;
      }
      if (
        selectedArea === 'Lake Terrace' &&
        o.section !== 'Lake Terrace' &&
        !o.tableLabel.toLowerCase().includes('terrace')
      ) {
        return false;
      }
      if (
        selectedArea === 'Poolside' &&
        o.section !== 'Poolside' &&
        !o.tableLabel.toLowerCase().includes('pool')
      ) {
        return false;
      }
      if (
        selectedArea === 'VIP Lounge' &&
        o.section !== 'VIP Lounge' &&
        !o.tableLabel.toLowerCase().includes('vip')
      ) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Accepted'
  ).length;
  const inProgressCount = orders.filter((o) => o.status === 'In Progress').length;
  const readyCount = orders.filter((o) => o.status === 'Ready').length;
  const delayedCount = orders.filter((o) => o.status === 'Delayed').length;

  return (
    <div className="space-y-6">
      {/* ─── PAGE HEADER & TABS ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#7A5A27]">
            Dining Dispatch
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#163D32] tracking-tight">
            Live Orders
          </h1>
          <p className="text-xs text-[#52645D]">
            Track and manage dining and room service orders in real time
          </p>
        </div>

        {/* Refresh and Filter actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadOrdersFromDb();
            }}
            className="flex items-center gap-2 rounded-xl bg-white border border-[#D5CCB9] px-3.5 py-2 text-xs font-bold text-[#163D32] shadow-xs hover:bg-[#F5F0E6] transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#7A5A27] ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>

          <div className="relative">
            <select
              aria-label="Filter orders by dining area"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="appearance-none rounded-xl border border-[#D5CCB9] bg-white py-2 pl-4 pr-9 text-xs font-bold text-[#163D32] shadow-xs focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#C5A46D]/30"
            >
              <option>All Areas</option>
              <option>Floor 1</option>
              <option>Lake Terrace</option>
              <option>Poolside</option>
              <option>VIP Lounge</option>
              <option>Room Service</option>
            </select>
            <Filter
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7A5A27]"
              aria-hidden="true"
            />
          </div>

          <Link
            href="/guest/order"
            className="flex items-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-4 py-2 text-xs font-bold text-[#F5F0E6] shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
            New Order
          </Link>
        </div>
      </div>

      {/* ─── FEEDBACK BANNER ─── */}
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss feedback"
            onClick={() => setFeedback(null)}
            className="rounded-lg p-1 opacity-75 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ─── MAIN TWO-COLUMN LAYOUT ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Orders Table */}
        <div className="xl:col-span-2 space-y-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
                  : 'bg-white text-[#52645D] hover:bg-[#EDE6D8] border border-[#E6DFD1]'
              }`}
            >
              All Orders
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeFilter === 'all'
                    ? 'bg-[#C5A46D]/25 text-[#F5F0E6]'
                    : 'bg-[#F5F0E6] text-[#163D32]'
                }`}
              >
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('pending')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                activeFilter === 'pending'
                  ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
                  : 'bg-white text-[#52645D] hover:bg-[#EDE6D8] border border-[#E6DFD1]'
              }`}
            >
              Pending / New
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeFilter === 'pending'
                    ? 'bg-[#C5A46D]/25 text-[#F5F0E6]'
                    : 'bg-blue-50 text-blue-800'
                }`}
              >
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('in_progress')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                activeFilter === 'in_progress'
                  ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
                  : 'bg-white text-[#52645D] hover:bg-[#EDE6D8] border border-[#E6DFD1]'
              }`}
            >
              In Progress
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeFilter === 'in_progress'
                    ? 'bg-[#C5A46D]/25 text-[#F5F0E6]'
                    : 'bg-[#F5F0E6] text-[#7A5A27]'
                }`}
              >
                {inProgressCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('ready')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                activeFilter === 'ready'
                  ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
                  : 'bg-white text-[#52645D] hover:bg-[#EDE6D8] border border-[#E6DFD1]'
              }`}
            >
              Ready
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeFilter === 'ready'
                    ? 'bg-[#C5A46D]/25 text-[#F5F0E6]'
                    : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {readyCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('delayed')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                activeFilter === 'delayed'
                  ? 'bg-[#163D32] text-[#F5F0E6] border border-[#C5A46D]/30 shadow-xs'
                  : 'bg-white text-[#52645D] hover:bg-[#EDE6D8] border border-[#E6DFD1]'
              }`}
            >
              Delayed
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeFilter === 'delayed'
                    ? 'bg-[#C5A46D]/25 text-[#F5F0E6]'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {delayedCount}
              </span>
            </button>
          </div>

          {/* Orders Table Container */}
          <div className="rounded-3xl bg-white shadow-xs border border-[#E6DFD1] overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-[#F5F0E6] border border-[#E6DFD1] text-[#7A5A27] flex items-center justify-center">
                  <Utensils className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h2 className="font-display text-lg font-semibold text-[#163D32]">
                    No Orders in Queue
                  </h2>
                  <p className="text-xs text-[#52645D] leading-relaxed">
                    No orders currently in this status. When guests place orders via QR code, room
                    service, or reception, tickets appear here in real time.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/guest/restaurant"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CCB9] px-4 py-2 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6]"
                  >
                    Browse Menu
                  </Link>
                  <Link
                    href="/staff/dashboard/tables"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-4 py-2 text-xs font-bold text-[#F5F0E6] shadow-xs"
                  >
                    View Tables
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6DFD1] bg-[#F5F0E6] text-[11px] font-bold uppercase tracking-wider text-[#52645D]">
                      <th className="py-3.5 px-4 sm:px-5">Order #</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Items</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Time</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DFD1] text-xs">
                    {filteredOrders.map((order) => {
                      const firstItem = order.items[0];
                      return (
                        <tr key={order.id} className="hover:bg-[#F5F0E6]/45 transition-colors group">
                          {/* Order Number */}
                          <td className="py-4 px-4 sm:px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center font-bold shrink-0">
                                <Utensils className="h-4 w-4" aria-hidden="true" />
                              </div>
                              <div>
                                <p className="font-bold text-[#163D32]">{order.orderNumber}</p>
                                <span className="text-[11px] font-semibold text-[#52645D]">
                                  {order.orderType}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4">
                            <p className="font-bold text-[#163D32] flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-[#7A5A27]" aria-hidden="true" />
                              {order.tableLabel}
                            </p>
                            <p className="text-[11px] text-[#52645D] mt-0.5">
                              {order.orderType === 'Room Service'
                                ? 'Suite Delivery'
                                : `${order.guestCount} guests`}
                            </p>
                          </td>

                          {/* Items Preview */}
                          <td className="py-4 px-4">
                            <div className="min-w-0 max-w-[200px]">
                              <p className="font-bold text-[#163D32] truncate">
                                {firstItem?.name || 'Meal items'}{' '}
                                <span className="text-[#7A5A27] font-semibold">
                                  ×{firstItem?.quantity || 1}
                                </span>
                              </p>
                              {order.items.length > 1 && (
                                <p className="text-[11px] text-[#52645D] truncate">
                                  +{order.items.length - 1} more (
                                  {order.items
                                    .slice(1)
                                    .map((i) => i.name)
                                    .join(', ')}
                                  )
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status Pill */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                order.status === 'Pending' || order.status === 'Accepted'
                                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                  : order.status === 'In Progress'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : order.status === 'Ready'
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                  : order.status === 'Delayed'
                                  ? 'bg-red-50 text-red-900 border border-red-200'
                                  : order.status === 'Cancelled'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : order.status === 'Delivered' || order.status === 'Completed'
                                  ? 'bg-[#163D32]/10 text-[#163D32] border border-[#163D32]/20'
                                  : 'bg-[#F5F0E6] text-[#163D32]'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  order.status === 'Pending' || order.status === 'Accepted'
                                    ? 'bg-blue-600'
                                    : order.status === 'In Progress'
                                    ? 'bg-amber-600 animate-pulse'
                                    : order.status === 'Ready'
                                    ? 'bg-emerald-600'
                                    : order.status === 'Delayed'
                                    ? 'bg-red-600 animate-pulse'
                                    : order.status === 'Cancelled'
                                    ? 'bg-rose-600'
                                    : 'bg-[#163D32]'
                                }`}
                              />
                              {order.status === 'Delayed'
                                ? `Delayed (${order.statusLabel})`
                                : order.status}
                            </span>
                          </td>

                          {/* Elapsed Time */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1 text-[#163D32] font-semibold">
                              <Clock className="h-3 w-3 text-[#7A5A27]" aria-hidden="true" />
                              <span>{order.elapsedMinutes}m</span>
                            </div>
                            <span className="text-[11px] text-[#52645D]">{order.placedTime}</span>
                          </td>

                          {/* Actions */}
                          <td
                            className="py-4 px-4 text-right relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {(order.status === 'Pending' || order.status === 'Accepted') && (
                                <button
                                  type="button"
                                  disabled={updatingOrderId === order.id}
                                  onClick={() => handleStatusChange(order, 'preparing', 'Preparing')}
                                  className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  title="Start Preparing"
                                >
                                  Prepare
                                </button>
                              )}
                              {(order.status === 'In Progress' || order.status === 'Delayed') && (
                                <button
                                  type="button"
                                  disabled={updatingOrderId === order.id}
                                  onClick={() => handleStatusChange(order, 'ready', 'Ready')}
                                  className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  title="Mark Ready"
                                >
                                  Ready
                                </button>
                              )}
                              {order.status === 'Ready' && (
                                <button
                                  type="button"
                                  disabled={updatingOrderId === order.id}
                                  onClick={() => handleStatusChange(order, 'delivered', 'Delivered')}
                                  className="rounded-lg bg-[#163D32]/10 hover:bg-[#163D32]/20 text-[#163D32] px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  title="Mark Delivered / Served"
                                >
                                  Served
                                </button>
                              )}
                              {order.status === 'Delivered' && (
                                <button
                                  type="button"
                                  disabled={updatingOrderId === order.id}
                                  onClick={() => handleStatusChange(order, 'completed', 'Completed')}
                                  className="rounded-lg bg-[#163D32] hover:bg-[#0F2D24] text-[#F5F0E6] px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  title="Complete Order"
                                >
                                  Complete
                                </button>
                              )}

                              {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  aria-label={`More actions for ${order.orderNumber}`}
                                  aria-expanded={actionMenuOrderId === order.id}
                                  disabled={updatingOrderId === order.id}
                                  onClick={() =>
                                    setActionMenuOrderId(
                                      actionMenuOrderId === order.id ? null : order.id
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-[#52645D] hover:text-[#163D32] hover:bg-[#F5F0E6] cursor-pointer disabled:opacity-50"
                                >
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>

                            {/* Dropdown Menu (Transition-Aware) */}
                            {actionMenuOrderId === order.id && (
                              <div className="absolute right-4 top-12 z-20 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-[#E6DFD1] text-left text-xs">
                                {order.status === 'Pending' && (
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() => handleStatusChange(order, 'accepted', 'Accepted')}
                                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F5F0E6] font-semibold text-[#163D32]"
                                  >
                                    Accept Order
                                  </button>
                                )}
                                {(order.status === 'Pending' || order.status === 'Accepted') && (
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() =>
                                      handleStatusChange(order, 'preparing', 'Preparing')
                                    }
                                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F5F0E6] font-semibold text-[#163D32]"
                                  >
                                    Start Preparing
                                  </button>
                                )}
                                {(order.status === 'Accepted' ||
                                  order.status === 'In Progress' ||
                                  order.status === 'Delayed') && (
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() => handleStatusChange(order, 'ready', 'Ready')}
                                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F5F0E6] font-semibold text-[#163D32]"
                                  >
                                    Mark Ready
                                  </button>
                                )}
                                {order.status === 'Ready' && (
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() =>
                                      handleStatusChange(order, 'delivered', 'Delivered')
                                    }
                                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F5F0E6] font-semibold text-[#163D32]"
                                  >
                                    Mark Delivered
                                  </button>
                                )}
                                {(order.status === 'In Progress' ||
                                  order.status === 'Delayed' ||
                                  order.status === 'Ready' ||
                                  order.status === 'Delivered') && (
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() =>
                                      handleStatusChange(order, 'completed', 'Completed')
                                    }
                                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F5F0E6] font-semibold text-[#163D32]"
                                  >
                                    Completed
                                  </button>
                                )}
                                {order.status !== 'Delivered' && (
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() =>
                                      handleStatusChange(order, 'cancelled', 'Cancelled')
                                    }
                                    className="w-full rounded-xl px-3 py-2 text-left hover:bg-rose-50 font-semibold text-rose-800"
                                  >
                                    Cancel Order
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Live Floor Map & Quick Panel */}
        <div className="space-y-6">
          {/* Restaurant Floor Mini-Map Widget */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E6DFD1]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-[#163D32]">
                Restaurant Floor
              </h2>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Status
              </span>
            </div>

            <div className="relative aspect-square w-full rounded-2xl bg-[#F5F0E6] border border-[#D5CCB9] p-3 overflow-hidden">
              <div className="pointer-events-none absolute top-2 right-2 rounded-lg bg-white/90 border border-[#E6DFD1] px-2 py-1 text-[10px] font-bold text-[#163D32]">
                Lakeside Terrace
              </div>
              <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#52645D]">
                Main Entrance
              </div>

              {tables.slice(0, 15).map((table, i) => {
                const isOccupied = table.status === 'occupied';
                const isCleaning = table.status === 'cleaning';
                const num = table.table_number.replace(/[^0-9]/g, '') || String(i + 1);

                return (
                  <div
                    key={table.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg flex flex-col items-center justify-center font-bold text-[10px] shadow-xs transition-transform hover:scale-110 ${
                      isOccupied
                        ? 'bg-[#163D32] text-[#F5F0E6] ring-1 ring-[#C5A46D]'
                        : isCleaning
                        ? 'bg-purple-700 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                    style={{
                      left: `${table.pos_x}%`,
                      top: `${table.pos_y}%`,
                      width: '32px',
                      height: '32px',
                    }}
                    title={`${table.table_number} (${table.status})`}
                  >
                    {num}
                    <span className="text-[7px] font-normal opacity-85">{table.capacity}p</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#52645D]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#163D32]" /> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-700" /> Cleaning
              </span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E6DFD1] space-y-3">
            <h2 className="font-display text-base font-semibold text-[#163D32]">
              Quick Navigation
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/guest/order"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] text-left flex items-center gap-2 group transition-colors"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <span className="text-xs font-bold text-[#163D32]">New Order</span>
              </Link>

              <Link
                href="/staff/dashboard/tables"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] text-left flex items-center gap-2 group transition-colors"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-[#163D32]">Table Layout</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
