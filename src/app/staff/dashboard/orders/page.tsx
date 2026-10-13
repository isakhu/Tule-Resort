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
  X
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

  // Initial realistic live orders data matching Image 2
  const [orders, setOrders] = useState<OrderDisplay[]>([
    {
      id: 'ord-4587',
      orderNumber: '#4587',
      tableLabel: 'Table 12',
      guestCount: 2,
      orderType: 'Dine-in',
      items: [
        { name: 'Pasta Alfredo', quantity: 1, price: 340, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80' },
        { name: 'Caesar Salad', quantity: 1, price: 220 },
      ],
      status: 'In Progress',
      elapsedMinutes: 12,
      placedTime: '12:33 PM',
      total: 560,
    },
    {
      id: 'ord-4586',
      orderNumber: '#4586',
      tableLabel: 'Table 8',
      guestCount: 4,
      orderType: 'Dine-in',
      items: [
        { name: 'Tule Special Tibs', quantity: 2, price: 750, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80' },
        { name: 'French Fries', quantity: 1, price: 160 },
      ],
      status: 'In Progress',
      elapsedMinutes: 18,
      placedTime: '12:27 PM',
      total: 1660,
    },
    {
      id: 'ord-4585',
      orderNumber: '#4585',
      tableLabel: 'Room 204',
      guestCount: 1,
      orderType: 'Room Service',
      items: [
        { name: 'Margherita Pizza', quantity: 1, price: 420, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=80' },
        { name: 'Fresh Juice', quantity: 1, price: 150 },
      ],
      status: 'Ready',
      elapsedMinutes: 25,
      placedTime: '12:20 PM',
      total: 570,
    },
    {
      id: 'ord-4584',
      orderNumber: '#4584',
      tableLabel: 'Terrace 02',
      guestCount: 3,
      orderType: 'Dine-in',
      items: [
        { name: 'Grilled Tilapia', quantity: 1, price: 520, imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=200&q=80' },
        { name: 'Roasted Vegetables', quantity: 1, price: 200 },
      ],
      status: 'Ready',
      elapsedMinutes: 32,
      placedTime: '12:13 PM',
      total: 720,
    },
    {
      id: 'ord-4583',
      orderNumber: '#4583',
      tableLabel: 'Table 03',
      guestCount: 2,
      orderType: 'Dine-in',
      items: [
        { name: 'Kitfo Special', quantity: 1, price: 850, imageUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=200&q=80' },
        { name: 'Ayeb & Gomen', quantity: 1, price: 180 },
      ],
      status: 'In Progress',
      elapsedMinutes: 38,
      placedTime: '12:07 PM',
      total: 1030,
    },
    {
      id: 'ord-4582',
      orderNumber: '#4582',
      tableLabel: 'Terrace 03',
      guestCount: 4,
      orderType: 'Dine-in',
      items: [
        { name: 'Doro Wot', quantity: 2, price: 950, imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=200&q=80' },
        { name: 'Garlic Bread', quantity: 1, price: 140 },
      ],
      status: 'Delayed',
      elapsedMinutes: 45,
      placedTime: '12:00 PM',
      total: 2040,
    },
    {
      id: 'ord-4581',
      orderNumber: '#4581',
      tableLabel: 'Room 305',
      guestCount: 1,
      orderType: 'Room Service',
      items: [
        { name: 'Lentil Soup', quantity: 1, price: 220, imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=200&q=80' },
        { name: 'Club Sandwich', quantity: 1, price: 380 },
      ],
      status: 'Ready',
      elapsedMinutes: 52,
      placedTime: '11:53 AM',
      total: 600,
    },
    {
      id: 'ord-4580',
      orderNumber: '#4580',
      tableLabel: 'Table 14',
      guestCount: 6,
      orderType: 'Dine-in',
      items: [
        { name: 'Haile Grand Feast', quantity: 2, price: 1400, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80' },
        { name: 'Onion Rings', quantity: 1, price: 180 },
      ],
      status: 'In Progress',
      elapsedMinutes: 58,
      placedTime: '11:47 AM',
      total: 2980,
    },
  ]);

  useEffect(() => {
    getDiningTables().then(setTables);
  }, []);

  const handleStatusChange = (orderId: string, newStatus: OrderDisplay['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    setActionMenuOrderId(null);
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Orders</h1>
          <p className="text-xs text-gray-500">Track and manage all orders in real time</p>
        </div>

        {/* Area filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-9 text-xs font-bold text-gray-700 shadow-sm focus:border-[#FF6B00] focus:outline-none"
            >
              <option>All Areas</option>
              <option>Floor 1</option>
              <option>Lake Terrace</option>
              <option>Poolside</option>
              <option>Room Service</option>
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          </div>
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
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'all'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Orders
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'in_progress'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              In Progress
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeFilter === 'in_progress' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {inProgressCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('ready')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'ready'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Ready
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeFilter === 'ready' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {readyCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('delayed')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                activeFilter === 'delayed'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Delayed
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeFilter === 'delayed' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                {delayedCount}
              </span>
            </button>
          </div>

          {/* Orders Table Container */}
          <div className="rounded-3xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#F8F9FA]/60 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    <th className="py-3.5 px-4 sm:px-5">Order #</th>
                    <th className="py-3.5 px-4">Table / Room</th>
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
                      <tr key={order.id} className="hover:bg-orange-50/20 transition-colors group">
                        {/* Order Number */}
                        <td className="py-4 px-4 sm:px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center font-black shrink-0">
                              <Utensils className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-black text-gray-900">{order.orderNumber}</p>
                              <span className="text-[10px] font-bold text-gray-400">{order.orderType}</span>
                            </div>
                          </div>
                        </td>

                        {/* Table / Room */}
                        <td className="py-4 px-4">
                          <p className="font-extrabold text-gray-900 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-[#FF6B00]" />
                            {order.tableLabel}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {order.orderType === 'Room Service' ? 'Online delivery' : `${order.guestCount} guests`}
                          </p>
                        </td>

                        {/* Items Preview with Thumbnail */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-9 w-9 rounded-xl bg-gray-100 bg-cover bg-center shrink-0 border border-gray-200"
                              style={{
                                backgroundImage: `url(${firstItem?.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80'})`,
                              }}
                            />
                            <div className="min-w-0 max-w-[150px] sm:max-w-[200px]">
                              <p className="font-bold text-gray-900 truncate">
                                {firstItem?.name} <span className="text-gray-400 font-semibold">×{firstItem?.quantity}</span>
                              </p>
                              {order.items.length > 1 && (
                                <p className="text-[10px] text-gray-400 truncate">
                                  +{order.items.length - 1} more ({order.items.slice(1).map((i) => i.name).join(', ')})
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status Pill */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                              order.status === 'Ready'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'Delayed'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-orange-50 text-[#FF6B00] border border-orange-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                order.status === 'Ready'
                                  ? 'bg-emerald-500'
                                  : order.status === 'Delayed'
                                  ? 'bg-red-500 animate-pulse'
                                  : 'bg-[#FF6B00]'
                              }`}
                            />
                            {order.status}
                          </span>
                        </td>

                        {/* Time */}
                        <td className="py-4 px-4">
                          <p className="font-extrabold text-gray-900">{order.elapsedMinutes} min</p>
                          <p className="text-[10px] text-gray-400">Since {order.placedTime}</p>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right relative">
                          <button
                            onClick={() =>
                              setActionMenuOrderId(actionMenuOrderId === order.id ? null : order.id)
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {actionMenuOrderId === order.id && (
                            <div className="absolute right-4 top-12 z-20 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-gray-100 text-left text-xs animate-in fade-in">
                              <button
                                onClick={() => handleStatusChange(order.id, 'In Progress')}
                                className="w-full flex items-center gap-2 px-3 py-2 font-bold text-gray-700 hover:bg-orange-50 hover:text-[#FF6B00] rounded-xl"
                              >
                                → Set In Progress
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'Ready')}
                                className="w-full flex items-center gap-2 px-3 py-2 font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl"
                              >
                                ✓ Mark Ready
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'Completed')}
                                className="w-full flex items-center gap-2 px-3 py-2 font-bold text-blue-700 hover:bg-blue-50 rounded-xl"
                              >
                                ★ Complete Order
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
          </div>
        </div>

        {/* Right Column (1 Col): Live Floor Map & Quick Panel */}
        <div className="space-y-6">
          {/* Restaurant Floor Mini-Map Widget */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Restaurant Floor</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live View
              </span>
            </div>

            {/* Floor Map Graphic Box */}
            <div className="relative aspect-square w-full rounded-2xl bg-[#F8F9FA] border border-gray-200/80 p-3 overflow-hidden">
              {/* Floor Layout Background Grid */}
              <div className="absolute top-2 right-2 rounded-lg bg-gray-200/60 p-1.5 text-[9px] font-bold text-gray-500">
                Bar / Counter
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
                        ? 'bg-[#FF6B00] text-white'
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
                <span className="h-2 w-2 rounded-full bg-[#FF6B00]" /> Occupied
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-600" /> Cleaning
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Delayed
              </span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/guest/order"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 text-left flex items-center gap-2 group transition-all"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#FF6B00]">New Order</span>
              </Link>

              <Link
                href="/staff/dashboard/tables"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 text-left flex items-center gap-2 group transition-all"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#FF6B00]">View Tables</span>
              </Link>

              <Link
                href="/staff/dashboard/menu"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 text-left flex items-center gap-2 group transition-all"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#FF6B00]">Check Menu</span>
              </Link>

              <Link
                href="/staff/dashboard/kitchen"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 text-left flex items-center gap-2 group transition-all"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <ChefHat className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-gray-700 group-hover:text-[#FF6B00]">Kitchen View</span>
              </Link>
            </div>
          </div>

          {/* Kitchen Delay Notice */}
          <div className="rounded-3xl bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 shadow-sm border border-orange-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#FF6B00]">
              <AlertTriangle className="h-4 w-4" />
              Kitchen Delay Detected
            </div>
            <p className="text-xs text-gray-600">
              8 orders have exceeded the expected preparation time (&gt; 20 min).
            </p>
            <Link
              href="/staff/dashboard/kitchen"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E85D04]"
            >
              Open Kitchen Station 2 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
