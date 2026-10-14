'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Plus,
  Utensils,
  Search,
  Filter,
  ArrowRight,
  ChefHat,
  Package,
  Eye,
  Check,
  X,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { updateOrderStatus } from '@/lib/orders';
import { getDiningTables, DiningTable } from '@/lib/diningTables';

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
  guestCount: number;
  orderType: 'Dine-in' | 'Takeaway' | 'Room Service';
  items: OrderItemDisplay[];
  status: 'In Progress' | 'Ready' | 'Delayed' | 'Completed';
  elapsedMinutes: number;
  placedTime: string;
  total: number;
}

export default function StaffOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'ready' | 'delayed'>('all');
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [actionMenuOrderId, setActionMenuOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderDisplay[]>([]);

  async function loadOrdersFromDb() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, status:order_statuses(id,name), items:order_items(id,menu_item_id,quantity,price,menu_item:menu_items(name,image_url))')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        setOrders([]);
        return;
      }

      const mapped: OrderDisplay[] = data.map((row: any) => {
        const stName = (row.status?.name || '').toLowerCase();
        let status: OrderDisplay['status'] = 'In Progress';
        if (stName.includes('ready')) status = 'Ready';
        else if (stName.includes('delay')) status = 'Delayed';
        else if (stName.includes('complete')) status = 'Completed';
        else status = 'In Progress';

        const tableLabel = row.table_token
          ? `Table ${row.table_token.replace('tule-tbl-', '').split('-')[0].toUpperCase()}`
          : row.room_number
          ? `Room ${row.room_number}`
          : row.guest_name
          ? `Guest: ${row.guest_name}`
          : 'Table Order';

        const items: OrderItemDisplay[] = (row.items || []).map((it: any) => ({
          name: it.menu_item?.name || 'Dish Item',
          quantity: it.quantity || 1,
          price: it.price || 0,
          imageUrl: it.menu_item?.image_url,
        }));

        const createdMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
        const elapsedMinutes = Math.max(0, Math.round((Date.now() - createdMs) / 60000));

        return {
          id: row.id,
          orderNumber: `#${String(row.id).slice(-4).toUpperCase()}`,
          tableLabel,
          guestCount: row.guest_count || 2,
          orderType: row.room_number ? 'Room Service' : 'Dine-in',
          items,
          status,
          elapsedMinutes,
          placedTime: row.created_at
            ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now',
          total: Number(row.total || 0),
        };
      });

      setOrders(mapped);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getDiningTables().then(setTables);
    void loadOrdersFromDb();

    // Subscribe to live order updates
    const channel = supabase
      .channel('staff:orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadOrdersFromDb();
      })
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderDisplay['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    setActionMenuOrderId(null);

    // Persist to Supabase if orderId is UUID
    if (!orderId.startsWith('ord-')) {
      const dbStatus = newStatus === 'In Progress' ? 'preparing' : newStatus === 'Ready' ? 'completed' : 'pending';
      await updateOrderStatus(orderId, dbStatus as any);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'in_progress' && o.status !== 'In Progress') return false;
    if (activeFilter === 'ready' && o.status !== 'Ready') return false;
    if (activeFilter === 'delayed' && o.status !== 'Delayed') return false;
    if (selectedArea !== 'All Areas') {
      if (selectedArea === 'Room Service' && o.orderType !== 'Room Service') return false;
      if (selectedArea === 'Floor 1' && !o.tableLabel.includes('Table')) return false;
      if (selectedArea === 'Lake Terrace' && !o.tableLabel.includes('Terrace')) return false;
    }
    return true;
  });

  const inProgressCount = orders.filter((o) => o.status === 'In Progress').length;
  const readyCount = orders.filter((o) => o.status === 'Ready').length;
  const delayedCount = orders.filter((o) => o.status === 'Delayed').length;

  return (
    <div className="space-y-6">
      {/* ─── PAGE HEADER & TABS ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Live Orders</h1>
          <p className="text-xs text-gray-500">Track and manage dining and room service orders in real time</p>
        </div>

        {/* Refresh and Filter actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              void loadOrdersFromDb();
            }}
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#0E7480] ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <div className="relative">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-9 text-xs font-bold text-gray-700 shadow-xs focus:border-[#0E7480] focus:outline-none"
            >
              <option>All Areas</option>
              <option>Floor 1</option>
              <option>Lake Terrace</option>
              <option>Poolside</option>
              <option>Room Service</option>
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          </div>

          <Link
            href="/guest/order"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0E7480] to-[#14919B] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#0E7480]/20 hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* ─── MAIN TWO-COLUMN LAYOUT ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Orders Table */}
        <div className="xl:col-span-2 space-y-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-[#0E7480] to-[#14919B] text-white shadow-md shadow-[#0E7480]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Orders
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === 'in_progress'
                  ? 'bg-gradient-to-r from-[#0E7480] to-[#14919B] text-white shadow-md shadow-[#0E7480]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              In Progress
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${activeFilter === 'in_progress' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {inProgressCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('ready')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === 'ready'
                  ? 'bg-gradient-to-r from-[#0E7480] to-[#14919B] text-white shadow-md shadow-[#0E7480]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Ready
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${activeFilter === 'ready' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {readyCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('delayed')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeFilter === 'delayed'
                  ? 'bg-gradient-to-r from-[#0E7480] to-[#14919B] text-white shadow-md shadow-[#0E7480]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Delayed
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${activeFilter === 'delayed' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'}`}>
                {delayedCount}
              </span>
            </button>
          </div>

          {/* Orders Table Container */}
          <div className="rounded-3xl bg-white shadow-xs border border-gray-200 overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-teal-50 text-[#0E7480] flex items-center justify-center">
                  <Utensils className="h-8 w-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-black text-gray-900">No Orders in Queue</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    No orders currently in this status. When guests place orders via QR code, room service, or pos, tickets appear here in real time.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href="/guest/restaurant"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Browse Menu
                  </Link>
                  <Link
                    href="/staff/dashboard/tables"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0E7480] to-[#14919B] px-4 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    View Tables
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#F4F7F8] text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4 sm:px-5">Order #</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Items</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Time</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredOrders.map((order) => {
                      const firstItem = order.items[0];
                      return (
                        <tr key={order.id} className="hover:bg-teal-50/20 transition-colors group">
                          {/* Order Number */}
                          <td className="py-4 px-4 sm:px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-xl bg-teal-50 text-[#0E7480] flex items-center justify-center font-black shrink-0">
                                <Utensils className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-black text-gray-900">{order.orderNumber}</p>
                                <span className="text-[10px] font-bold text-gray-400">{order.orderType}</span>
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4">
                            <p className="font-extrabold text-gray-900 flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-[#0E7480]" />
                              {order.tableLabel}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {order.orderType === 'Room Service' ? 'Suite Delivery' : `${order.guestCount} guests`}
                            </p>
                          </td>

                          {/* Items Preview */}
                          <td className="py-4 px-4">
                            <div className="min-w-0 max-w-[200px]">
                              <p className="font-bold text-gray-900 truncate">
                                {firstItem?.name || 'Meal items'} <span className="text-gray-400 font-semibold">×{firstItem?.quantity || 1}</span>
                              </p>
                              {order.items.length > 1 && (
                                <p className="text-[10px] text-gray-400 truncate">
                                  +{order.items.length - 1} more ({order.items.slice(1).map((i) => i.name).join(', ')})
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status Pill */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                order.status === 'In Progress'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : order.status === 'Ready'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : order.status === 'Delayed'
                                  ? 'bg-red-50 text-red-800 border border-red-200'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  order.status === 'In Progress'
                                    ? 'bg-amber-500 animate-pulse'
                                    : order.status === 'Ready'
                                    ? 'bg-emerald-500'
                                    : order.status === 'Delayed'
                                    ? 'bg-red-500 animate-pulse'
                                    : 'bg-gray-400'
                                }`}
                              />
                              {order.status}
                            </span>
                          </td>

                          {/* Elapsed Time */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1 text-gray-700 font-semibold">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span>{order.elapsedMinutes}m</span>
                            </div>
                            <span className="text-[10px] text-gray-400">{order.placedTime}</span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right relative">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.status === 'In Progress' && (
                                <button
                                  onClick={() => handleStatusChange(order.id, 'Ready')}
                                  className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Mark Ready"
                                >
                                  Ready
                                </button>
                              )}
                              {order.status === 'Ready' && (
                                <button
                                  onClick={() => handleStatusChange(order.id, 'Completed')}
                                  className="rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0E7480] px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Complete Order"
                                >
                                  Served
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  setActionMenuOrderId(actionMenuOrderId === order.id ? null : order.id)
                                }
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Dropdown Menu */}
                            {actionMenuOrderId === order.id && (
                              <div className="absolute right-4 top-12 z-20 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-gray-100 text-left text-xs">
                                <button
                                  onClick={() => handleStatusChange(order.id, 'In Progress')}
                                  className="w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50 font-semibold text-gray-700"
                                >
                                  In Progress
                                </button>
                                <button
                                  onClick={() => handleStatusChange(order.id, 'Ready')}
                                  className="w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50 font-semibold text-gray-700"
                                >
                                  Mark Ready
                                </button>
                                <button
                                  onClick={() => handleStatusChange(order.id, 'Completed')}
                                  className="w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50 font-semibold text-gray-700"
                                >
                                  Completed
                                </button>
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
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Restaurant Floor</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Status
              </span>
            </div>

            {/* Floor Map Graphic Box */}
            <div className="relative aspect-square w-full rounded-2xl bg-[#F4F7F8] border border-gray-200 p-3 overflow-hidden">
              <div className="absolute top-2 right-2 rounded-lg bg-gray-200/80 px-2 py-1 text-[9px] font-bold text-gray-600">
                Lakeside Terrace
              </div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-400">
                Main Entrance
              </div>

              {/* Render Mini Tables */}
              {tables.slice(0, 15).map((table, i) => {
                const isOccupied = table.status === 'occupied';
                const isCleaning = table.status === 'cleaning';
                const num = table.table_number.replace(/[^0-9]/g, '') || String(i + 1);

                return (
                  <div
                    key={table.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg flex flex-col items-center justify-center font-black text-[10px] shadow-xs transition-transform hover:scale-110 cursor-pointer ${
                      isOccupied
                        ? 'bg-[#0E7480] text-white'
                        : isCleaning
                        ? 'bg-purple-600 text-white'
                        : 'bg-emerald-500 text-white'
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
                    <span className="text-[7px] font-normal opacity-80">{table.capacity}p</span>
                  </div>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#0E7480]" /> Occupied
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-600" /> Cleaning
              </span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-gray-200 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Navigation</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/guest/order"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 text-left flex items-center gap-2 group transition-all"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#0E7480]">New Order</span>
              </Link>

              <Link
                href="/staff/dashboard/tables"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 text-left flex items-center gap-2 group transition-all"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#0E7480]">Table Layout</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
