'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ClipboardList,
  Clock,
  DollarSign,
  AlertTriangle,
  PlusCircle,
  BarChart3,
  Users,
  Settings,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  ChefHat,
  Sparkles,
  CheckCircle2,
  Package
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getDiningTables, DiningTable } from '@/lib/diningTables';

interface UserProfile {
  id: string;
  fullName: string | null;
  role: string;
  departmentName: string | null;
}

interface RecentActivityItem {
  id: string;
  orderNumber: string;
  location: string;
  itemsText: string;
  timeAgo: string;
  status: string;
}

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [delayedOrdersCount, setDelayedOrdersCount] = useState(0);
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);

  const [hourlySales, setHourlySales] = useState<{ hour: string; value: number }[]>([
    { hour: '8 AM', value: 0 },
    { hour: '10 AM', value: 0 },
    { hour: '12 PM', value: 0 },
    { hour: '2 PM', value: 0 },
    { hour: '4 PM', value: 0 },
    { hour: '6 PM', value: 0 },
    { hour: '8 PM', value: 0 },
    { hour: '10 PM', value: 0 },
  ]);

  useEffect(() => {
    // Determine greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Date
    setCurrentDateFormatted(
      new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    );

    // Profile
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch('/api/staff/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.profile) setProfile(json.profile);
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
    });

    // Tables
    getDiningTables().then(setTables);

    // Live counts from DB
    async function fetchOrdersSummary() {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayIso = startOfToday.toISOString();

        const { data } = await supabase
          .from('orders')
          .select('id, total, created_at, status_id, room_number, table_token, guest_name')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const now = Date.now();

          // Today's orders (excluding cancelled status_id === 5)
          const todayOrders = data.filter(
            (o) => o.created_at >= todayIso && o.status_id !== 5
          );
          const totalRev = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
          setRevenueToday(Math.round(totalRev));

          // Active orders (not completed = 4, not cancelled = 5)
          const activeOrders = data.filter((o) => o.status_id !== 4 && o.status_id !== 5);
          setActiveOrdersCount(activeOrders.length);

          // Delayed orders: active orders waiting > 30 minutes
          const delayed = activeOrders.filter((o) => {
            const diffMins = (now - new Date(o.created_at).getTime()) / 60000;
            return diffMins > 30;
          }).length;
          setDelayedOrdersCount(delayed);

          // Real hourly distribution for today
          const buckets = [
            { label: '8 AM', minHour: 0, maxHour: 9 },
            { label: '10 AM', minHour: 9, maxHour: 11 },
            { label: '12 PM', minHour: 11, maxHour: 13 },
            { label: '2 PM', minHour: 13, maxHour: 15 },
            { label: '4 PM', minHour: 15, maxHour: 17 },
            { label: '6 PM', minHour: 17, maxHour: 19 },
            { label: '8 PM', minHour: 19, maxHour: 21 },
            { label: '10 PM', minHour: 21, maxHour: 24 },
          ];

          const calculatedHourly = buckets.map((b) => {
            const val = todayOrders
              .filter((o) => {
                const h = new Date(o.created_at).getHours();
                return h >= b.minHour && h < b.maxHour;
              })
              .reduce((sum, o) => sum + Number(o.total || 0), 0);
            return { hour: b.label, value: Math.round(val) };
          });
          setHourlySales(calculatedHourly);

          // Build recent activity list from real DB orders
          const acts: RecentActivityItem[] = data.slice(0, 4).map((o) => {
            const mins = Math.max(0, Math.round((now - new Date(o.created_at).getTime()) / 60000));
            const loc = o.table_token
              ? `Table ${o.table_token.replace('tule-tbl-', '').split('-')[0].toUpperCase()}`
              : o.room_number
              ? `Room ${o.room_number}`
              : 'Dining Floor';

            return {
              id: o.id,
              orderNumber: `#${String(o.id).slice(-4).toUpperCase()}`,
              location: loc,
              itemsText: `${Number(o.total || 0).toLocaleString()} ETB`,
              timeAgo: mins === 0 ? 'Just now' : `${mins} min ago`,
              status: o.status_id === 4 ? 'Completed' : o.status_id === 5 ? 'Cancelled' : 'Active',
            };
          });
          setRecentActivities(acts);
        } else {
          setActiveOrdersCount(0);
          setRevenueToday(0);
          setDelayedOrdersCount(0);
          setRecentActivities([]);
        }
      } catch (e) {
        console.error('Failed to load orders summary:', e);
      }
    }

    void fetchOrdersSummary();
  }, []);

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const totalTables = tables.length || 24;
  const occupancyPercent = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const maxSale = Math.max(1, ...hourlySales.map((h) => h.value));

  return (
    <div className="space-y-6">
      {/* ─── 1. HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B252C] via-[#0E3A45] to-[#07191E] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80)',
          }}
        />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9902F]/40 bg-[#C9902F]/15 px-3 py-1 text-xs font-semibold text-[#F8D77A] backdrop-blur-md">
            <Clock className="h-3.5 w-3.5" />
            <span>{currentDateFormatted || 'Today'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-serif">
            {greeting},{' '}
            <span className="text-[#F8D77A]">
              {profile?.fullName?.split(' ')[0] || 'Manager'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/80">
            Welcome to the Tule Resort staff operations center. Monitor tables, orders, kitchen dispatch, and guest requests.
          </p>
        </div>
      </div>

      {/* ─── 2. KPI METRICS ROW ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Occupied Tables */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-[#0E7480] flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Occupancy</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Occupied Tables</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {occupiedTables}{' '}
              <span className="text-sm font-semibold text-gray-400">/ {totalTables}</span>
            </p>
          </div>
          <div className="mt-3 space-y-1">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0E7480] to-[#14919B] rounded-full transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-gray-500">{occupancyPercent}% occupied</p>
          </div>
        </div>

        {/* Active Orders */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
              Live
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Active Orders</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{activeOrdersCount}</p>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">
            {activeOrdersCount === 0 ? 'Queue clear' : 'In kitchen preparation'}
          </p>
        </div>

        {/* Avg Prep Time */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-[#0E7480] flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
              <TrendingDown className="h-3 w-3" /> Target
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Avg. Prep Time</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">18 min</p>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">Fresh lake tilapia & tibs</p>
        </div>

        {/* Today's Revenue */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-[#C9902F] flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#C9902F]">
              <TrendingUp className="h-3 w-3" /> ETB
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Today&apos;s Revenue</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {revenueToday.toLocaleString()}{' '}
              <span className="text-xs font-bold text-gray-500">ETB</span>
            </p>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">Dining & room service</p>
        </div>

        {/* Delayed Orders */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200 col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${delayedOrdersCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {delayedOrdersCount > 0 ? 'Alert' : 'Normal'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Delayed Orders</p>
            <p className={`text-2xl font-black mt-0.5 ${delayedOrdersCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {delayedOrdersCount}
            </p>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">
            {delayedOrdersCount > 0 ? 'Needs kitchen attention' : 'No delayed orders'}
          </p>
        </div>
      </div>

      {/* ─── 3. MAIN DASHBOARD CONTENT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg): Sales Overview & Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Sales Overview Chart */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900">Today&apos;s Dining Volume</h3>
                <p className="text-xs text-gray-400">Hourly guest dining volume & kitchen dispatch</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#F4F7F8] px-3 py-1.5 text-xs font-bold text-gray-700">
                Today
              </div>
            </div>

            {/* Custom SVG / Bar Chart */}
            <div className="h-52 flex items-end gap-2 sm:gap-3 pt-6 border-b border-gray-100">
              {revenueToday === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-400">
                  <BarChart3 className="h-8 w-8 text-gray-300 mb-1" />
                  <p className="text-xs font-bold text-gray-500">No Sales Recorded Today</p>
                  <p className="text-[10px] text-gray-400">Volume bars will appear here as orders are placed</p>
                </div>
              ) : (
                hourlySales.map((item, idx) => {
                  const heightPercent = Math.max(8, Math.round((item.value / maxSale) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#0E7480] to-[#14919B] transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-105 origin-bottom relative"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex rounded bg-[#0B252C] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg pointer-events-none whitespace-nowrap z-10">
                          {item.value} ETB
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400 truncate max-w-full">
                        {item.hour}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Operations Insight Alert Box */}
          <div className="rounded-3xl bg-gradient-to-br from-teal-50/70 via-white to-amber-50/50 p-6 shadow-xs border border-teal-100">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0E7480]">
              <Sparkles className="h-4 w-4 text-[#C9902F]" />
              Operations Status
            </div>
            <div className="mt-2">
              <h4 className="text-sm font-extrabold text-gray-900">
                {delayedOrdersCount > 0 ? 'Kitchen attention recommended' : 'Dining floor running smoothly'}
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                {delayedOrdersCount > 0
                  ? `${delayedOrdersCount} orders waiting longer than usual. Please review kitchen line dispatch.`
                  : 'All kitchen lines, dining tables, and room service delivery are operating within standard turnaround times.'}
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                href="/staff/dashboard/kitchen"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0E7480] to-[#14919B] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#0E7480]/20 hover:brightness-110 transition-all"
              >
                Kitchen Queue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/staff/dashboard/tables"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Table Map
              </Link>
            </div>
          </div>

          {/* Quick Overview Navigation Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Navigation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/staff/dashboard/tables"
                className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs hover:border-[#0E7480] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-teal-50 text-[#0E7480] flex items-center justify-center">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Tables</p>
                    <p className="text-[10px] text-gray-400">View layout</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#0E7480] transition-colors" />
              </Link>

              <Link
                href="/staff/dashboard/orders"
                className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs hover:border-[#0E7480] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Orders</p>
                    <p className="text-[10px] text-gray-400">Active tickets</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
              </Link>

              <Link
                href="/staff/dashboard/kitchen"
                className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs hover:border-[#0E7480] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-50 text-[#C9902F] flex items-center justify-center">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Kitchen</p>
                    <p className="text-[10px] text-gray-400">Preparation</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#C9902F] transition-colors" />
              </Link>

              <Link
                href="/staff/dashboard/menu"
                className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs hover:border-[#0E7480] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Menu CMS</p>
                    <p className="text-[10px] text-gray-400">Dishes & rates</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-purple-600 transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col on lg): Quick Actions & Recent Activity */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <Link
                href="/guest/order"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 hover:border-teal-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center font-bold text-base">
                  +
                </div>
                <span className="text-[11px] font-bold text-gray-700">New Order</span>
              </Link>

              <Link
                href="/staff/dashboard/tables"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 hover:border-teal-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">View Tables</span>
              </Link>

              <Link
                href="/staff/dashboard/menu"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 hover:border-teal-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Menu CMS</span>
              </Link>

              <Link
                href="/staff/dashboard/receipts"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 hover:border-teal-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Reports</span>
              </Link>

              <Link
                href="/admin/staff"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 hover:border-teal-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Staff Team</span>
              </Link>

              <Link
                href="/staff/dashboard/settings"
                className="p-3 rounded-2xl bg-[#F4F7F8] hover:bg-teal-50 border border-gray-100 hover:border-teal-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#0E7480] flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Settings</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
              <Link href="/staff/dashboard/orders" className="text-xs font-bold text-[#0E7480] hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <div className="p-6 text-center text-gray-400 space-y-1">
                <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-gray-600">No Orders Logged Yet Today</p>
                <p className="text-[10px] text-gray-400">New table scans and orders will be recorded here live</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="h-8 w-8 rounded-xl bg-teal-50 text-[#0E7480] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900">Order {act.orderNumber}</p>
                      <p className="text-[11px] text-gray-500">{act.location} • {act.itemsText}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 shrink-0">{act.timeAgo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
