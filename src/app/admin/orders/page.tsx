'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Loader2, MapPin, Package, Utensils } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { updateOrderStatus } from '@/lib/orders';
import { ORDER_STATUS_ID, getCanonicalOrderStatusLabel } from '@/lib/orderStatuses';

interface OrderItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  menu_item_id?: string;
}

interface RawAdminOrderRow {
  id: string;
  guest_name?: string | null;
  room_number?: string | null;
  total?: number | string | null;
  notes?: string | null;
  status_id?: number | null;
  status?: { id: number; name: string } | Array<{ id: number; name: string }> | null;
  created_at: string;
  items?: Array<{
    id?: string;
    quantity?: number | null;
    price?: number | null;
    menu_item_id?: string | null;
    menu_item?: { name?: string | null } | Array<{ name?: string | null }> | null;
  }> | null;
}

interface Order {
  id: string;
  guest_name?: string;
  room_number?: string | null;
  items: OrderItem[];
  total: number;
  notes?: string;
  statusId: number;
  statusLabel: string;
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'preparing' | 'completed' | 'cancelled';

const NORMALIZE_STATUS = (statusId?: number | null, value?: string | null): Exclude<StatusFilter, 'all'> => {
  if (statusId === ORDER_STATUS_ID.CANCELLED) return 'cancelled';
  if (statusId === ORDER_STATUS_ID.COMPLETED) return 'completed';
  if (statusId === ORDER_STATUS_ID.PREPARING || statusId === ORDER_STATUS_ID.IN_PROGRESS || statusId === ORDER_STATUS_ID.READY || statusId === ORDER_STATUS_ID.DELIVERED) {
    return 'preparing';
  }
  const normalized = (value ?? 'Pending').toLowerCase();
  if (normalized.includes('prep') || normalized.includes('progress') || normalized.includes('ready') || normalized.includes('deliver')) return 'preparing';
  if (normalized.includes('complete')) return 'completed';
  if (normalized.includes('cancel')) return 'cancelled';
  return 'pending';
};

const STATUS_COLORS: Record<Exclude<StatusFilter, 'all'>, { border: string; badge: string }> = {
  pending: { border: 'border-l-[#C5A46D]', badge: 'bg-[#C5A46D]/20 text-[#7A5A27]' },
  preparing: { border: 'border-l-[#163D32]', badge: 'bg-[#163D32]/10 text-[#163D32]' },
  completed: { border: 'border-l-emerald-700', badge: 'bg-emerald-100 text-emerald-900' },
  cancelled: { border: 'border-l-red-700', badge: 'bg-red-100 text-red-900' },
};

function getNextTransitions(statusId: number): Array<{ label: string; target: 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled' }> {
  switch (statusId) {
    case ORDER_STATUS_ID.PENDING:
      return [
        { label: 'Accept', target: 'confirmed' },
        { label: 'Start Prep', target: 'preparing' },
        { label: 'Cancel', target: 'cancelled' },
      ];
    case ORDER_STATUS_ID.CONFIRMED:
    case ORDER_STATUS_ID.ACCEPTED:
      return [
        { label: 'Start Prep', target: 'preparing' },
        { label: 'Cancel', target: 'cancelled' },
      ];
    case ORDER_STATUS_ID.PREPARING:
    case ORDER_STATUS_ID.IN_PROGRESS:
      return [
        { label: 'Mark Ready', target: 'ready' },
        { label: 'Cancel', target: 'cancelled' },
      ];
    case ORDER_STATUS_ID.READY:
      return [{ label: 'Mark Delivered', target: 'delivered' }];
    case ORDER_STATUS_ID.DELIVERED:
      return [{ label: 'Mark Completed', target: 'completed' }];
    default:
      return [];
  }
}

function formatTimeAgo(date: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function OrderCard({
  order,
  onStatusUpdate,
}: {
  order: Order;
  onStatusUpdate: (order: Order, target: string) => void;
}) {
  const bucket = NORMALIZE_STATUS(order.statusId, order.statusLabel);
  const colors = STATUS_COLORS[bucket];
  const nextActions = getNextTransitions(order.statusId);
  const shortId = order.id.slice(-6).toUpperCase();

  return (
    <div className={`rounded-2xl border border-[#163D32]/15 border-l-4 ${colors.border} bg-white p-5 shadow-xs`}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-[#163D32]">#{shortId}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colors.badge}`}>
              {order.statusLabel}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#52645D]">
            <Clock className="h-3.5 w-3.5" />
            {formatTimeAgo(order.created_at)}
          </p>
        </div>
        <p className="text-lg font-black text-[#163D32]">{order.total.toLocaleString()} ETB</p>
      </div>

      <div className="mb-3 space-y-1 text-sm">
        {order.guest_name && <p className="font-semibold text-[#26312D]">{order.guest_name}</p>}
        {order.room_number && (
          <span className="flex items-center gap-1 text-xs font-medium text-[#52645D]">
            <MapPin className="h-3.5 w-3.5 text-[#7A5A27]" /> Room {order.room_number}
          </span>
        )}
      </div>

      {order.items.length > 0 && (
        <div className="mb-3 rounded-xl bg-[#F5F0E6]/70 border border-[#163D32]/10 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#52645D]">
            <Package className="h-3.5 w-3.5" /> Items
          </div>
          <div className="space-y-1">
            {order.items.map((item, idx) => (
              <div key={item.id ?? item.menu_item_id ?? `${item.name}-${idx}`} className="flex justify-between text-xs text-[#26312D]">
                <span>
                  {item.name} <span className="font-bold">×{item.quantity ?? 1}</span>
                </span>
                <span className="font-semibold text-[#163D32]">
                  {(Number(item.price ?? 0) * Number(item.quantity ?? 1)).toLocaleString()} ETB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.notes && (
        <div className="mb-3 rounded-xl border border-[#C5A46D]/30 bg-[#C5A46D]/10 p-2.5">
          <p className="mb-0.5 text-xs font-bold text-[#7A5A27]">Notes</p>
          <p className="text-xs text-[#26312D]">{order.notes}</p>
        </div>
      )}

      {nextActions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextActions.map((act) => (
            <button
              key={act.target}
              type="button"
              onClick={() => onStatusUpdate(order, act.target)}
              className={`flex-1 min-w-[90px] rounded-xl px-3 py-2 text-xs font-bold transition ${
                act.target === 'cancelled'
                  ? 'border border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                  : 'bg-[#163D32] text-[#F5F0E6] hover:bg-[#0F2D24]'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[#F5F0E6] px-3 py-2 text-center text-xs font-semibold text-[#52645D]">
          No further actions available
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const loadOrders = useCallback(async () => {
    try {
      setError('');
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, status:order_statuses(id,name), items:order_items(id,menu_item_id,quantity,price,menu_item:menu_items(name))')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;
      const normalized: Order[] = ((data ?? []) as RawAdminOrderRow[]).map((row) => {
        const st = Array.isArray(row.status) ? row.status[0] : row.status;
        const statusId = Number(row.status_id ?? st?.id ?? ORDER_STATUS_ID.PENDING);
        return {
          id: row.id,
          guest_name: row.guest_name ?? undefined,
          room_number: row.room_number ?? null,
          total: Number(row.total ?? 0),
          notes: row.notes ?? undefined,
          statusId,
          statusLabel: getCanonicalOrderStatusLabel(statusId, st?.name),
          created_at: row.created_at,
          items: (row.items ?? []).map((item) => {
            const mi = Array.isArray(item.menu_item) ? item.menu_item[0] : item.menu_item;
            return {
              id: item.id,
              menu_item_id: item.menu_item_id ?? undefined,
              quantity: Number(item.quantity ?? 1),
              price: Number(item.price ?? 0),
              name: mi?.name ?? 'Menu item',
            };
          }),
        };
      });
      setOrders(normalized);
    } catch (err) {
      console.warn('Failed to load initial orders:', err);
      setError('Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadOrders());
  }, [loadOrders]);

  useEffect(() => {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadOrders();
      })
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => statusFilter === 'all' || NORMALIZE_STATUS(order.statusId, order.statusLabel) === statusFilter),
    [orders, statusFilter]
  );

  async function handleStatusUpdate(order: Order, target: string) {
    setError('');
    const result = await updateOrderStatus(order.id, target, `Admin updated order to ${target}`, order.statusId);
    if (!result.success) {
      setError(`Failed to update order: ${result.error}`);
    }
    await loadOrders();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#163D32]/15 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Utensils className="h-6 w-6 text-[#7A5A27]" />
            <h1 className="text-2xl font-black text-[#163D32]">Kitchen & Room Service Orders</h1>
          </div>
          <p className="mt-1 text-sm text-[#52645D]">
            Admin order oversight synchronized with staff fulfillment transitions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/staff/dashboard/orders"
            className="rounded-xl border border-[#163D32]/20 bg-white px-4 py-2 text-xs font-bold text-[#163D32] hover:bg-[#EDE8DC] transition"
          >
            Open Live Orders
          </Link>
          <Link
            href="/admin/staff"
            className="rounded-xl bg-[#163D32] px-4 py-2 text-xs font-bold text-[#F5F0E6] hover:bg-[#0F2D24] transition"
          >
            Staff Access
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['all', 'pending', 'preparing', 'completed', 'cancelled'] as const).map((filter) => {
          const count =
            filter === 'all'
              ? orders.length
              : orders.filter((o) => NORMALIZE_STATUS(o.statusId, o.statusLabel) === filter).length;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                statusFilter === filter
                  ? 'bg-[#163D32] text-[#F5F0E6] shadow-sm'
                  : 'border border-[#163D32]/15 bg-white text-[#26312D] hover:bg-[#EDE8DC]'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#163D32]/15 bg-white p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#163D32]" />
            <p className="text-sm font-medium text-[#52645D]">Loading orders...</p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-[#163D32]/15 bg-white p-12 text-center">
          <p className="text-base font-bold text-[#163D32]">No {statusFilter !== 'all' ? statusFilter : ''} orders</p>
          <p className="mt-1 text-sm text-[#52645D]">
            {statusFilter === 'all'
              ? 'Orders will appear here when guests place them.'
              : `No orders with status "${statusFilter}" at the moment.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
