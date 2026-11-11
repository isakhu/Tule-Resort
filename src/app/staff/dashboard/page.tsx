'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  DollarSign,
  Layers,
  Package,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getDiningTables, DiningTable } from '@/lib/diningTables';
import {
  formatOrderLocationLabel,
  getCanonicalOrderStatusLabel,
  isActiveOrderStatus,
  isCancelledStatus,
  isCompletedStatus,
  isDelayedInPreparation,
  isDeliveredStatus,
  isReadyStatus,
  ORDER_STATUS_ID,
} from '@/lib/orderStatuses';

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

interface DashboardOrderRow {
  id: string;
  total: number | string | null;
  created_at: string;
  updated_at?: string | null;
  status_id: number | null;
  room_number?: string | null;
  guest_name?: string | null;
  dining_table?: { table_number?: string | null } | Array<{ table_number?: string | null }> | null;
  status?: { id?: number; name?: string | null } | Array<{ id?: number; name?: string | null }> | null;
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getInitialGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getInitialFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [delayedOrdersCount, setDelayedOrdersCount] = useState(0);
  const [avgPrepMinutes, setAvgPrepMinutes] = useState<number | null>(null);
  const [prepSampleCount, setPrepSampleCount] = useState(0);
  const [greeting] = useState<string>(getInitialGreeting);
  const [currentDateFormatted] = useState<string>(getInitialFormattedDate);
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
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token || !mounted) return;
      try {
        const res = await fetch('/api/staff/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && mounted) {
          const json = await res.json();
          if (json.profile) setProfile(json.profile);
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
    });

    getDiningTables()
      .then((rows) => {
        if (mounted) setTables(rows);
      })
      .catch((err) => {
        console.warn('Could not load dining tables for dashboard:', err);
      });

    async function fetchOrdersSummary() {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayIso = startOfToday.toISOString();

        const { data, error } = await supabase
          .from('orders')
          .select(
            'id, total, created_at, updated_at, status_id, room_number, guest_name, dining_table:dining_tables(table_number), status:order_statuses(id, name)'
          )
          .order('created_at', { ascending: false })
          .limit(300);

        if (!mounted) return;

        if (!error && data && data.length > 0) {
          const rows = data as DashboardOrderRow[];
          const now = Date.now();

          const todayOrders = rows.filter((o) => {
            const st = unwrapSingle(o.status);
            return o.created_at >= todayIso && !isCancelledStatus(o.status_id, st?.name);
          });
          const totalRev = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
          setRevenueToday(Math.round(totalRev));

          const activeOrders = rows.filter((o) => {
            const st = unwrapSingle(o.status);
            return isActiveOrderStatus(o.status_id, st?.name);
          });
          setActiveOrdersCount(activeOrders.length);

          const delayed = activeOrders.filter((o) => {
            const st = unwrapSingle(o.status);
            return isDelayedInPreparation(o.created_at, o.status_id, st?.name, 35);
          }).length;
          setDelayedOrdersCount(delayed);

          const fulfilledOrders = rows.filter((o) => {
            const st = unwrapSingle(o.status);
            return (
              isReadyStatus(o.status_id, st?.name) ||
              isDeliveredStatus(o.status_id, st?.name) ||
              isCompletedStatus(o.status_id, st?.name)
            );
          });

          const prepDurations: number[] = [];
          if (fulfilledOrders.length > 0) {
            const orderIds = fulfilledOrders.slice(0, 50).map((o) => o.id);
            const { data: historyRows } = await supabase
              .from('status_history')
              .select('entity_id, to_status_id, changed_at')
              .eq('entity_type', 'order')
              .in('entity_id', orderIds)
              .in('to_status_id', [
                ORDER_STATUS_ID.READY,
                ORDER_STATUS_ID.DELIVERED,
                ORDER_STATUS_ID.COMPLETED,
              ])
              .order('changed_at', { ascending: true });

            if (!mounted) return;

            const earliestFinishByOrder = new Map<string, number>();
            for (const h of historyRows ?? []) {
              if (h?.entity_id && h?.changed_at && !earliestFinishByOrder.has(h.entity_id)) {
                const ms = new Date(h.changed_at).getTime();
                if (Number.isFinite(ms)) {
                  earliestFinishByOrder.set(h.entity_id, ms);
                }
              }
            }

            for (const order of fulfilledOrders.slice(0, 50)) {
              const startMs = new Date(order.created_at).getTime();
              if (!Number.isFinite(startMs)) continue;

              const finishMs =
                earliestFinishByOrder.get(order.id) ??
                (order.updated_at ? new Date(order.updated_at).getTime() : NaN);

              if (Number.isFinite(finishMs) && finishMs > startMs) {
                const mins = Math.round((finishMs - startMs) / 60000);
                if (mins >= 1 && mins <= 240) {
                  prepDurations.push(mins);
                }
              }
            }
          }

          if (prepDurations.length > 0) {
            const avg = Math.round(prepDurations.reduce((a, b) => a + b, 0) / prepDurations.length);
            setAvgPrepMinutes(avg);
            setPrepSampleCount(prepDurations.length);
          } else {
            setAvgPrepMinutes(null);
            setPrepSampleCount(0);
          }

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

          const acts: RecentActivityItem[] = rows.slice(0, 4).map((o) => {
            const st = unwrapSingle(o.status);
            const tbl = unwrapSingle(o.dining_table);
            const mins = Math.max(0, Math.round((now - new Date(o.created_at).getTime()) / 60000));
            const loc = formatOrderLocationLabel({
              tableNumber: tbl?.table_number,
              roomNumber: o.room_number,
              guestName: o.guest_name,
              fallback: 'Dining Floor',
            });

            return {
              id: o.id,
              orderNumber: `#${String(o.id).slice(-4).toUpperCase()}`,
              location: loc,
              itemsText: `${Number(o.total || 0).toLocaleString()} ETB`,
              timeAgo: mins === 0 ? 'Just now' : `${mins} min ago`,
              status: getCanonicalOrderStatusLabel(o.status_id, st?.name),
            };
          });
          setRecentActivities(acts);
        } else {
          setActiveOrdersCount(0);
          setRevenueToday(0);
          setDelayedOrdersCount(0);
          setAvgPrepMinutes(null);
          setPrepSampleCount(0);
          setRecentActivities([]);
        }
      } catch (e) {
        console.error('Failed to load orders summary:', e);
      }
    }

    void fetchOrdersSummary();

    return () => {
      mounted = false;
    };
  }, []);

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const totalTables = tables.length || 24;
  const occupancyPercent = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const maxSale = Math.max(1, ...hourlySales.map((h) => h.value));

  return (
    <div className="space-y-6">
      {/* ─── 1. HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#163D32] via-[#0F2D24] to-[#0A1F18] text-[#F5F0E6] p-6 sm:p-8 shadow-lg border border-[#C5A46D]/25">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-75"
          style={{
            background:
              'radial-gradient(circle at 88% 18%, rgba(197, 164, 109, 0.24), transparent 52%), radial-gradient(circle at 12% 85%, rgba(197, 164, 109, 0.12), transparent 45%)',
          }}
        />
        <div className="relative z-10 max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-3 py-1 text-xs font-semibold text-[#E8D5AF]">
            <Clock className="h-3.5 w-3.5 text-[#C5A46D]" aria-hidden="true" />
            <span>{currentDateFormatted || 'Today'}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F0E6]">
            {greeting},{' '}
            <span className="text-[#E8D5AF]">
              {profile?.fullName?.split(' ')[0] || 'Manager'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#E6DFD1]/90">
            Welcome to the Tule Resort staff operations center. Monitor tables, orders, kitchen
            dispatch, and guest requests.
          </p>
        </div>
      </div>

      {/* ─── 2. KPI METRICS ROW ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Occupied Tables */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-[11px] font-bold text-[#7A5A27] uppercase tracking-wider">
              Occupancy
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-[#52645D]">Occupied Tables</p>
            <p className="text-2xl font-bold text-[#163D32] mt-0.5">
              {occupiedTables}{' '}
              <span className="text-sm font-semibold text-[#52645D]">/ {totalTables}</span>
            </p>
          </div>
          <div className="mt-3 space-y-1">
            <div className="h-1.5 w-full bg-[#F5F0E6] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#163D32] to-[#C5A46D] rounded-full transition-[width] duration-500"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
            <p className="text-[11px] font-semibold text-[#52645D]">
              {occupancyPercent}% occupied
            </p>
          </div>
        </div>

        {/* Active Orders */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
              Live
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-[#52645D]">Active Orders</p>
            <p className="text-2xl font-bold text-[#163D32] mt-0.5">{activeOrdersCount}</p>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-[#52645D]">
            {activeOrdersCount === 0 ? 'Queue clear' : 'In kitchen preparation'}
          </p>
        </div>

        {/* Avg Prep Time */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
              <TrendingDown className="h-3 w-3" aria-hidden="true" />{' '}
              {avgPrepMinutes !== null ? 'Measured' : 'Live'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-[#52645D]">Avg. Prep Time</p>
            <p className="text-2xl font-bold text-[#163D32] mt-0.5">
              {avgPrepMinutes !== null ? `${avgPrepMinutes} min` : 'Unavailable'}
            </p>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-[#52645D]">
            {avgPrepMinutes !== null
              ? `Across ${prepSampleCount} fulfilled order${prepSampleCount > 1 ? 's' : ''}`
              : 'Awaiting completed tickets'}
          </p>
        </div>

        {/* Today's Revenue */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#E6DFD1] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-[#F5F0E6] text-[#7A5A27] border border-[#E6DFD1] flex items-center justify-center">
              <DollarSign className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#7A5A27]">
              <TrendingUp className="h-3 w-3" aria-hidden="true" /> ETB
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-[#52645D]">Today&apos;s Revenue</p>
            <p className="text-2xl font-bold text-[#163D32] mt-0.5">
              {revenueToday.toLocaleString()}{' '}
              <span className="text-xs font-bold text-[#52645D]">ETB</span>
            </p>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-[#52645D]">Dining &amp; room service</p>
        </div>

        {/* Delayed Orders */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#E6DFD1] col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                delayedOrdersCount > 0
                  ? 'bg-red-100 text-red-800'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {delayedOrdersCount > 0 ? 'Alert' : 'Normal'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-[#52645D]">Delayed Orders</p>
            <p
              className={`text-2xl font-bold mt-0.5 ${
                delayedOrdersCount > 0 ? 'text-red-700' : 'text-[#163D32]'
              }`}
            >
              {delayedOrdersCount}
            </p>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-[#52645D]">
            {delayedOrdersCount > 0 ? 'Needs kitchen attention' : 'No delayed orders'}
          </p>
        </div>
      </div>

      {/* ─── 3. MAIN DASHBOARD CONTENT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Sales Overview Chart */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E6DFD1]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#163D32]">
                  Today&apos;s Dining Volume
                </h2>
                <p className="text-xs text-[#52645D]">
                  Hourly guest dining volume &amp; kitchen dispatch
                </p>
              </div>
              <div className="rounded-xl border border-[#E6DFD1] bg-[#F5F0E6] px-3 py-1.5 text-xs font-bold text-[#163D32]">
                Today
              </div>
            </div>

            <div className="h-52 flex items-end gap-2 sm:gap-3 pt-6 border-b border-[#E6DFD1]">
              {revenueToday === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center text-[#52645D]">
                  <BarChart3 className="h-8 w-8 text-[#C5A46D] mb-1" aria-hidden="true" />
                  <p className="text-xs font-bold text-[#163D32]">No Sales Recorded Today</p>
                  <p className="text-[11px] text-[#52645D]">
                    Volume bars will appear here as orders are placed
                  </p>
                </div>
              ) : (
                hourlySales.map((item, idx) => {
                  const heightPercent = Math.max(8, Math.round((item.value / maxSale) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                    >
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#163D32] to-[#C5A46D] transition-transform duration-300 group-hover:scale-y-105 origin-bottom relative"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex rounded bg-[#0F2D24] px-2 py-0.5 text-[10px] font-bold text-[#F5F0E6] shadow-md pointer-events-none whitespace-nowrap z-10">
                          {item.value} ETB
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#52645D] truncate max-w-full">
                        {item.hour}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Operations Insight Alert Box */}
          <div className="rounded-3xl bg-gradient-to-br from-[#F5F0E6] via-white to-[#EDE6D8]/70 p-6 shadow-xs border border-[#E6DFD1]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A5A27]">
              <Sparkles className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
              Operations Status
            </div>
            <div className="mt-2">
              <h3 className="font-display text-lg font-semibold text-[#163D32]">
                {delayedOrdersCount > 0
                  ? 'Kitchen attention recommended'
                  : 'Dining floor running smoothly'}
              </h3>
              <p className="text-xs text-[#52645D] mt-1">
                {delayedOrdersCount > 0
                  ? `${delayedOrdersCount} orders waiting longer than usual. Please review kitchen line dispatch.`
                  : 'All kitchen lines, dining tables, and room service delivery are operating within standard turnaround times.'}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/staff/dashboard/kitchen"
                className="inline-flex items-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] border border-[#C5A46D]/30 px-5 py-2.5 text-xs font-bold text-[#F5F0E6] shadow-xs transition-colors"
              >
                Kitchen Queue <ArrowRight className="h-3.5 w-3.5 text-[#C5A46D]" aria-hidden="true" />
              </Link>
              <Link
                href="/staff/dashboard/tables"
                className="inline-flex items-center gap-2 rounded-xl border border-[#D5CCB9] bg-white px-4 py-2.5 text-xs font-bold text-[#163D32] hover:bg-[#F5F0E6] transition-colors"
              >
                Table Map
              </Link>
            </div>
          </div>

          {/* Quick Overview Navigation Cards */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-semibold text-[#163D32]">
              Quick Navigation
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/staff/dashboard/tables"
                className="p-3.5 rounded-2xl bg-white border border-[#E6DFD1] shadow-xs hover:border-[#C5A46D] transition-colors group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                    <Layers className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#163D32]">Tables</p>
                    <p className="text-[11px] text-[#52645D]">View layout</p>
                  </div>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[#C5A46D] group-hover:text-[#163D32] transition-colors"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="/staff/dashboard/orders"
                className="p-3.5 rounded-2xl bg-white border border-[#E6DFD1] shadow-xs hover:border-[#C5A46D] transition-colors group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#163D32]">Orders</p>
                    <p className="text-[11px] text-[#52645D]">Active tickets</p>
                  </div>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[#C5A46D] group-hover:text-[#163D32] transition-colors"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="/staff/dashboard/kitchen"
                className="p-3.5 rounded-2xl bg-white border border-[#E6DFD1] shadow-xs hover:border-[#C5A46D] transition-colors group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#F5F0E6] text-[#7A5A27] flex items-center justify-center">
                    <ChefHat className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#163D32]">Kitchen</p>
                    <p className="text-[11px] text-[#52645D]">Preparation</p>
                  </div>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[#C5A46D] group-hover:text-[#163D32] transition-colors"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="/staff/dashboard/menu"
                className="p-3.5 rounded-2xl bg-white border border-[#E6DFD1] shadow-xs hover:border-[#C5A46D] transition-colors group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Package className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#163D32]">Menu CMS</p>
                    <p className="text-[11px] text-[#52645D]">Dishes &amp; rates</p>
                  </div>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[#C5A46D] group-hover:text-[#163D32] transition-colors"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col on lg) */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E6DFD1]">
            <h2 className="font-display text-base font-semibold text-[#163D32] mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-2.5">
              <Link
                href="/guest/order"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] transition-colors text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center font-bold text-base">
                  +
                </div>
                <span className="text-[11px] font-bold text-[#163D32]">New Order</span>
              </Link>

              <Link
                href="/staff/dashboard/tables"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] transition-colors text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-bold text-[#163D32]">View Tables</span>
              </Link>

              <Link
                href="/staff/dashboard/menu"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] transition-colors text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                  <Package className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-bold text-[#163D32]">Menu CMS</span>
              </Link>

              <Link
                href="/staff/dashboard/receipts"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] transition-colors text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-bold text-[#163D32]">Reports</span>
              </Link>

              <Link
                href="/admin/staff"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] transition-colors text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-bold text-[#163D32]">Staff Team</span>
              </Link>

              <Link
                href="/staff/dashboard/settings"
                className="p-3 rounded-2xl bg-[#F5F0E6]/60 hover:bg-[#F5F0E6] border border-[#E6DFD1] hover:border-[#C5A46D] transition-colors text-center flex flex-col items-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-bold text-[#163D32]">Settings</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E6DFD1]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-[#163D32]">
                Recent Activity
              </h2>
              <Link
                href="/staff/dashboard/orders"
                className="text-xs font-bold text-[#7A5A27] hover:text-[#163D32] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <div className="p-6 text-center text-[#52645D] space-y-1">
                <CheckCircle2
                  className="h-6 w-6 mx-auto text-[#7A5A27] mb-2"
                  aria-hidden="true"
                />
                <p className="text-xs font-bold text-[#163D32]">No Orders Logged Yet Today</p>
                <p className="text-[11px] text-[#52645D]">
                  New table scans and orders will be recorded here live
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-[#F5F0E6]/60 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-xl bg-[#163D32]/10 text-[#163D32] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#163D32]">
                        Order {act.orderNumber}{' '}
                        <span className="ml-1 rounded-full bg-[#F5F0E6] border border-[#E6DFD1] px-2 py-0.5 text-[10px] font-bold text-[#7A5A27]">
                          {act.status}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#52645D]">
                        {act.location} • {act.itemsText}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#52645D] shrink-0">
                      {act.timeAgo}
                    </span>
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
