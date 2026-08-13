'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Loader2, MapPin, Package, Phone, RefreshCw, Utensils } from 'lucide-react';
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
  total_amount?: number;
  total?: number;
  service_type?: string;
  special_instructions?: string;
  notes?: string;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'preparing' | 'completed' | 'cancelled';

const STATUS_COLORS: Record<Order['status'], { bg: string; badge: string; text: string }> = {
  pending: { bg: 'bg-yellow-50', badge: 'bg-yellow-200 text-yellow-900', text: 'text-yellow-700' },
  preparing: { bg: 'bg-blue-50', badge: 'bg-blue-200 text-blue-900', text: 'text-blue-700' },
  completed: { bg: 'bg-green-50', badge: 'bg-green-200 text-green-900', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-50', badge: 'bg-red-200 text-red-900', text: 'text-red-700' },
};

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const NEXT_STATUSES: Record<Order['status'], Order['status'][]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function OrderCard({ order, onStatusUpdate }: { order: Order; onStatusUpdate: (orderId: string, status: Order['status']) => void }) {
  const colors = STATUS_COLORS[order.status];
  const items = (order.items ?? []).filter((item) => item && item.name);
  const totalPrice = order.total_amount ?? order.total ?? 0;
  const specialInstructions = order.special_instructions ?? order.notes;
  const nextStatuses = NEXT_STATUSES[order.status];
  const orderTime = formatTimeAgo(order.created_at);
  const orderId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className={`rounded-lg border-l-4 ${colors.bg} p-4 shadow-sm border border-gray-200`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">#{orderId}</p>
            <span className={`px-2 py-1 text-xs font-semibold rounded ${colors.badge}`}>{STATUS_LABELS[order.status]}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {orderTime}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{Number(totalPrice).toLocaleString()} ETB</p>
        </div>
      </div>

      <div className="mb-3 space-y-1.5 text-sm">
        {order.guest_name && <p className="text-gray-700 font-medium">{order.guest_name}</p>}
        <div className="flex items-center gap-4 text-gray-600">
          {order.room_number && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Room {order.room_number}
            </span>
          )}
          {order.service_type && (
            <span className="flex items-center gap-1">
              <Utensils className="h-4 w-4" />
              {order.service_type === 'room_service' ? 'Room Service' : 'Restaurant'}
            </span>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-3 rounded bg-white/50 p-2.5">
          <div className="flex items-center gap-1 mb-2 text-xs font-semibold text-gray-700">
            <Package className="h-4 w-4" />
            Items
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id ?? item.name} className="flex justify-between text-xs text-gray-700">
                <span>
                  {item.name} <span className="font-semibold">×{item.quantity ?? 1}</span>
                </span>
                {item.price && <span className="font-medium">{(item.price * (item.quantity ?? 1)).toLocaleString()} ETB</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {specialInstructions && (
        <div className="mb-3 rounded bg-orange-50 border border-orange-200 p-2.5">
          <p className="text-xs font-semibold text-orange-900 mb-1">Special Instructions</p>
          <p className="text-xs text-orange-800">{specialInstructions}</p>
        </div>
      )}

      {nextStatuses.length > 0 && (
        <div className="flex gap-2">
          {nextStatuses.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={() => onStatusUpdate(order.id, nextStatus)}
              className="flex-1 rounded bg-white px-3 py-2 text-xs font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50 transition"
            >
              {nextStatus === 'preparing' && '→ Preparing'}
              {nextStatus === 'completed' && '✓ Complete'}
              {nextStatus === 'cancelled' && '✕ Cancel'}
            </button>
          ))}
        </div>
      )}

      {nextStatuses.length === 0 && (
        <div className="rounded bg-gray-100 px-3 py-2 text-xs text-gray-600 text-center font-medium">
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
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadOrders() {
      try {
        setError('');
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (fetchError) throw fetchError;
        setOrders((data ?? []) as Order[]);
      } catch (err) {
        console.warn('Failed to load initial orders:', err);
        setError('Unable to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  useEffect(() => {
    if (!supabase || !supabase.channel) return;

    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    setUpdating((prev) => new Set([...prev, orderId]));

    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)),
    );

    const result = await updateOrderStatus(orderId, newStatus);

    if (!result.success) {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });

      setOrders((prev) => {
        const order = prev.find((o) => o.id === orderId);
        if (!order) return prev;

        return prev.map((o) => (o.id === orderId ? { ...o, status: (order.status as any) } : o));
      });

      setError(`Failed to update order: ${result.error}`);
    } else {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin/staff" className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 inline-flex items-center gap-2">
            ← Admin
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Utensils className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Kitchen & Room Service Orders</h1>
          </div>
          <p className="text-sm text-gray-600">Live order management dashboard with real-time updates</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {(['all', 'pending', 'preparing', 'completed', 'cancelled'] as const).map((filter) => {
            const count = filter === 'all' ? orders.length : orders.filter((o) => o.status === filter).length;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === filter
                    ? 'bg-orange-600 text-white shadow'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-600">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-base font-medium text-gray-900">No {statusFilter !== 'all' ? statusFilter : ''} orders</p>
            <p className="mt-1 text-sm text-gray-600">
              {statusFilter === 'all'
                ? 'Orders will appear here when guests place them.'
                : `No orders with status "${statusFilter}" at the moment.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
