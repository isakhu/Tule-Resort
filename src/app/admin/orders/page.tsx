'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Loader2, MapPin, Package, Utensils } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { updateOrderStatus } from '@/lib/orders';

interface OrderItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  menu_item_id?: string;
}

interface Order {
  id: string;
  guest_name?: string;
  room_number?: string | null;
  items?: OrderItem[];
  total?: number;
  notes?: string;
  status?: { id: number; name: string } | null;
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'preparing' | 'completed' | 'cancelled';

const NORMALIZE_STATUS = (value?: string | null): Exclude<StatusFilter, 'all'> => {
  const normalized = (value ?? 'Pending').toLowerCase();
  if (normalized === 'preparing') return 'preparing';
  if (normalized === 'completed' || normalized === 'delivered' || normalized === 'ready') return 'completed';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return 'pending';
};

const STATUS_COLORS: Record<Exclude<StatusFilter, 'all'>, { bg: string; badge: string }> = {
  pending: { bg: 'bg-yellow-50', badge: 'bg-yellow-200 text-yellow-900' },
  preparing: { bg: 'bg-blue-50', badge: 'bg-blue-200 text-blue-900' },
  completed: { bg: 'bg-green-50', badge: 'bg-green-200 text-green-900' },
  cancelled: { bg: 'bg-red-50', badge: 'bg-red-200 text-red-900' },
};

const NEXT_STATUSES: Record<Exclude<StatusFilter, 'all'>, Exclude<StatusFilter, 'all'>[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function formatTimeAgo(date: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function OrderCard({ order, onStatusUpdate }: { order: Order; onStatusUpdate: (orderId: string, status: Exclude<StatusFilter, 'all'>) => void }) {
  const currentStatus = NORMALIZE_STATUS(order.status?.name);
  const colors = STATUS_COLORS[currentStatus];
  const items = (order.items ?? []).filter((item) => item && item.name);
  const nextStatuses = NEXT_STATUSES[currentStatus];
  const orderId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className={`rounded-lg border-l-4 ${colors.bg} border border-gray-200 p-4 shadow-sm`}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">#{orderId}</p>
            <span className={`rounded px-2 py-1 text-xs font-semibold ${colors.badge}`}>{currentStatus}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3.5 w-3.5" />{formatTimeAgo(order.created_at)}</p>
        </div>
        <p className="text-lg font-bold text-gray-900">{Number(order.total ?? 0).toLocaleString()} ETB</p>
      </div>

      <div className="mb-3 space-y-1.5 text-sm">
        {order.guest_name && <p className="font-medium text-gray-700">{order.guest_name}</p>}
        {order.room_number && <span className="flex items-center gap-1 text-gray-600"><MapPin className="h-4 w-4" />Room {order.room_number}</span>}
      </div>

      {items.length > 0 && (
        <div className="mb-3 rounded bg-white/50 p-2.5">
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-700"><Package className="h-4 w-4" />Items</div>
          <div className="space-y-1">
            {items.map((item) => <div key={item.id ?? item.menu_item_id ?? item.name} className="flex justify-between text-xs text-gray-700"><span>{item.name} <span className="font-semibold">×{item.quantity ?? 1}</span></span><span className="font-medium">{(Number(item.price ?? 0) * Number(item.quantity ?? 1)).toLocaleString()} ETB</span></div>)}
          </div>
        </div>
      )}

      {order.notes && <div className="mb-3 rounded border border-orange-200 bg-orange-50 p-2.5"><p className="mb-1 text-xs font-semibold text-orange-900">Notes</p><p className="text-xs text-orange-800">{order.notes}</p></div>}

      {nextStatuses.length > 0 ? <div className="flex gap-2">{nextStatuses.map((nextStatus) => <button key={nextStatus} onClick={() => onStatusUpdate(order.id, nextStatus)} className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50">{nextStatus === 'preparing' ? '→ Preparing' : nextStatus === 'completed' ? '✓ Complete' : '✕ Cancel'}</button>)}</div> : <div className="rounded bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-600">No further actions available</div>}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  async function loadOrders() {
    try {
      setError('');
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, status:order_statuses(id,name), items:order_items(id,menu_item_id,quantity,price,menu_item:menu_items(name))')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;
      const normalized = ((data ?? []) as any[]).map((row) => ({
        ...row,
        items: (row.items ?? []).map((item: any) => ({ ...item, name: item.menu_item?.name ?? 'Menu item' })),
      })) as Order[];
      setOrders(normalized);
    } catch (err) {
      console.warn('Failed to load initial orders:', err);
      setError('Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void loadOrders(); })
      .subscribe();
    return () => { void channel.unsubscribe(); };
  }, []);

  const filteredOrders = useMemo(() => orders.filter((order) => statusFilter === 'all' || NORMALIZE_STATUS(order.status?.name) === statusFilter), [orders, statusFilter]);

  async function handleStatusUpdate(orderId: string, newStatus: Exclude<StatusFilter, 'all'>) {
    setError('');
    const previous = orders;
    const optimistic = orders.map((order) => order.id === orderId ? { ...order, status: { id: order.status?.id ?? 0, name: newStatus } } : order);
    setOrders(optimistic);
    const result = await updateOrderStatus(orderId, newStatus);
    if (!result.success) {
      setOrders(previous);
      setError(`Failed to update order: ${result.error}`);
      return;
    }
    await loadOrders();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white shadow-sm"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><Link href="/admin/staff" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">← Admin</Link><div className="mb-2 flex items-center gap-3"><Utensils className="h-8 w-8 text-orange-600"/><h1 className="text-3xl font-bold text-gray-900">Kitchen & Room Service Orders</h1></div><p className="text-sm text-gray-600">Live order management dashboard with real-time updates</p></div></header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"><AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"/><p className="text-sm text-red-800">{error}</p></div>}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">{(['all','pending','preparing','completed','cancelled'] as const).map((filter) => {const count = filter === 'all' ? orders.length : orders.filter((o) => NORMALIZE_STATUS(o.status?.name) === filter).length;return <button key={filter} onClick={() => setStatusFilter(filter)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${statusFilter === filter ? 'bg-orange-600 text-white shadow' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>{filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})</button>})}</div>
        {loading ? <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12"><div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-gray-400"/><p className="text-sm text-gray-600">Loading orders...</p></div></div> : filteredOrders.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-12 text-center"><p className="text-base font-medium text-gray-900">No {statusFilter !== 'all' ? statusFilter : ''} orders</p><p className="mt-1 text-sm text-gray-600">{statusFilter === 'all' ? 'Orders will appear here when guests place them.' : `No orders with status "${statusFilter}" at the moment.`}</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredOrders.map((order) => <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate}/>)}</div>}
      </main>
    </div>
  );
}
