'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ClipboardList,
  Clock,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  ArrowRight,
  ChefHat,
  Sparkles,
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

interface DashboardOrder {
  id: string;
  total: number | string | null;
  created_at: string;
  room_number?: string | null;
  dining_table?: { table_number?: string } | null;
  status?: { name?: string } | null;
}

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [orderValueToday, setOrderValueToday] = useState(0);
  const [delayedOrdersCount, setDelayedOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [dashboardLoadError, setDashboardLoadError] = useState('');
  const [hourlySales, setHourlySales] = useState(
    Array.from({ length: 12 }, (_, index) => {
      const hour = index + 10;
      return { hour: `${hour > 12 ? hour - 12 : hour} ${hour < 12 ? 'AM' : 'PM'}`, value: 0 };
    }),
  );
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');

  useEffect(() => {
    // Defer browser-local display hydration until after the initial render.
    const displayTimer = window.setTimeout(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');

      setCurrentDateFormatted(
        new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    }, 0);

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

    // Pull today's orders only. No hard-coded sample revenue or order counts.
    async function fetchOrdersSummary() {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data, error } = await supabase
          .from('orders')
          .select('id,total,created_at,room_number,dining_table:dining_tables(table_number),status:order_statuses(name)')
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;
        const rows = (data ?? []) as DashboardOrder[];
        const todayRows = rows.filter((order) => new Date(order.created_at) >= startOfDay);
        const activeStatuses = new Set(['pending', 'confirmed', 'accepted', 'preparing', 'in progress', 'ready']);
        const statusName = (order: DashboardOrder) => (order.status?.name ?? 'pending').toLowerCase();
        const activeRows = rows.filter((order) => activeStatuses.has(statusName(order)));
        const now = Date.now();
        const delayedRows = activeRows.filter((order) => {
          const createdAt = Date.parse(order.created_at);
          return Number.isFinite(createdAt) && now - createdAt >= 20 * 60 * 1000;
        });

        setRecentOrders(rows.slice(0, 5));
        setActiveOrdersCount(activeRows.length);
        // This is order value, not collected revenue: payment integration is not enabled yet.
        setOrderValueToday(Math.round(todayRows.reduce((sum, order) => sum + Number(order.total ?? 0), 0)));
        setDelayedOrdersCount(delayedRows.length);

        const labels = Array.from({ length: 12 }, (_, index) => {
          const hour = index + 10;
          return {
            hour: `${hour > 12 ? hour - 12 : hour} ${hour < 12 ? 'AM' : 'PM'}`,
            hour24: hour % 24,
          };
        });
        setHourlySales(labels.map(({ hour, hour24 }) => ({
          hour,
          value: Math.round(todayRows
            .filter((order) => new Date(order.created_at).getHours() === hour24)
            .reduce((sum, order) => sum + Number(order.total ?? 0), 0)),
        })));
        setDashboardLoadError('');
      } catch (error) {
        console.error("Failed to load today's order summary:", error);
        setDashboardLoadError('Live order metrics could not be loaded. Check the connection and staff permissions.');
      }
    }
    void fetchOrdersSummary();
    return () => window.clearTimeout(displayTimer);
  }, []);

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const totalTables = tables.length;
  const occupancyPercent = totalTables ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const maxSale = Math.max(1, ...hourlySales.map((h) => h.value));

  return (
    <div className="space-y-6">
      {/* ─── 1. HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#11161B] via-[#1A232C] to-[#0A1828] text-white p-6 sm:p-8 shadow-xl">
        {/* Background photo blend */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80)',
          }}
        />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-300 backdrop-blur-md">
            <Clock className="h-3.5 w-3.5" />
            <span>{currentDateFormatted || 'Today'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {greeting},{' '}
            <span className="text-[#FF6B00]">
              {profile?.fullName?.split(' ')[0] || 'Team'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Here&apos;s what&apos;s happening at your resort restaurant and dining floor today.
          </p>
        </div>
      </div>

      {/* ─── 2. KPI METRICS ROW ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Occupied Tables */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Occupancy</span>
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
                className="h-full bg-[#FF6B00] rounded-full transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-gray-500">{occupancyPercent}% occupancy</p>
          </div>
        </div>

        {/* Active Orders */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
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
          <p className="mt-3 text-[10px] font-bold text-gray-400">Pending through ready</p>
        </div>

        {/* Avg Prep Time */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">Not measured</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Avg. Prep Time</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">—</p>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">Preparation-time tracking not configured</p>
        </div>

        {/* Today's Revenue */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400">Live</span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Today&apos;s Order Value</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">
              {orderValueToday.toLocaleString()}{' '}
              <span className="text-xs font-bold text-gray-500">ETB</span>
            </p>
          </div>
          <p className="mt-3 text-[10px] font-bold text-gray-400">Order value; payment status is not tracked yet</p>
        </div>

        {/* Delayed Orders */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
              Alert
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500">Delayed Orders</p>
            <p className="text-2xl font-black text-red-600 mt-0.5">{delayedOrdersCount}</p>
          </div>
          <p className="mt-3 text-[10px] font-bold text-red-500">Needs kitchen attention</p>
        </div>
      </div>

      {/* ─── 3. MAIN DASHBOARD CONTENT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg): Sales Overview & Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Sales Overview Chart */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900">Today&apos;s Order Activity</h3>
                <p className="text-xs text-gray-400">Hourly order value based on today's submitted orders</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#F8F9FA] px-3 py-1.5 text-xs font-bold text-gray-700">
                Today
              </div>
            </div>

            {/* Custom SVG / Bar Chart */}
            <div className="h-52 flex items-end gap-2 sm:gap-3 pt-6 border-b border-gray-100">
              {hourlySales.map((item, idx) => {
                const heightPercent = Math.round((item.value / maxSale) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#FF6B00] to-[#FA812F] transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-105 origin-bottom relative"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex rounded bg-[#11161B] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg pointer-events-none whitespace-nowrap z-10">
                        {item.value} ETB
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 truncate max-w-full">
                      {item.hour}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operations Insight Alert Box */}
          <div className="rounded-3xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 p-6 shadow-sm border border-orange-100">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FF6B00]">
              <Sparkles className="h-4 w-4" />
              Insight for You
            </div>
            <div className="mt-2">
              <h4 className="text-sm font-extrabold text-gray-900">
                {delayedOrdersCount > 0 ? 'Kitchen attention needed' : 'No overdue orders detected'}
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                {delayedOrdersCount > 0
                  ? `${delayedOrdersCount} active order${delayedOrdersCount === 1 ? '' : 's'} have been waiting for at least 20 minutes based on recorded timestamps.`
                  : 'No active orders currently exceed the 20-minute alert threshold.'}
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/staff/dashboard/orders"
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#E85D04] transition-all"
              >
                Open Order Queue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Overview Navigation Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/staff/dashboard/tables"
                className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-[#FF6B00] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Tables</p>
                    <p className="text-[10px] text-gray-400">View all tables</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#FF6B00] transition-colors" />
              </Link>

              <Link
                href="/staff/dashboard/orders"
                className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-[#FF6B00] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Orders</p>
                    <p className="text-[10px] text-gray-400">View orders</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
              </Link>

              <Link
                href="/staff/dashboard/orders"
                className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-[#FF6B00] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Kitchen</p>
                    <p className="text-[10px] text-gray-400">View live orders</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-amber-600 transition-colors" />
              </Link>

              <Link
                href="/staff/dashboard/menu"
                className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-[#FF6B00] transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Inventory</p>
                    <p className="text-[10px] text-gray-400">Check menu</p>
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
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <Link
                href="/guest/order"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center font-bold text-base">
                  +
                </div>
                <span className="text-[11px] font-bold text-gray-700">New Order</span>
              </Link>

              <Link
                href="/staff/dashboard/tables"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">View Tables</span>
              </Link>

              <Link
                href="/staff/dashboard/menu"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Inventory</span>
              </Link>

              <Link
                href="/staff/dashboard/receipts"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Reports</span>
              </Link>

              <Link
                href="/admin/staff"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Staff</span>
              </Link>

              <Link
                href="/staff/dashboard/settings"
                className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-all text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">Settings</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
              <Link href="/staff/dashboard/orders" className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3.5">
              {dashboardLoadError ? (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{dashboardLoadError}</p>
              ) : recentOrders.length ? recentOrders.map((order) => (
                <div key={order.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[11px] text-gray-500">
                      {order.dining_table?.table_number ? order.dining_table.table_number : order.room_number ? `Room ${order.room_number}` : 'Restaurant order'} • {(order.status?.name ?? 'Pending').toLowerCase()}
                    </p>
                    <p className="text-[10px] text-gray-400">{Number(order.total ?? 0).toLocaleString()} ETB order value</p>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )) : (
                <p className="rounded-xl border border-dashed border-gray-200 p-4 text-xs text-gray-500">
                  No orders have been recorded today.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
