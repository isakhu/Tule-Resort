'use client';

import React, { useState, useEffect, useMemo, use, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  UtensilsCrossed,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  XCircle,
  RotateCw,
  Ban
} from 'lucide-react';
import { getMenuItems, MenuItem } from '@/lib/menu';
import { DiningTable, TableSession } from '@/lib/diningTables';
import { supabase } from '@/lib/supabaseClient';
import { cancelGuestItem } from '@/lib/guestSession';

interface ActiveOrderInfo {
  id: string;
  status_id: number;
  total: number;
  created_at: string;
  notes?: string;
  status?: { id: number; name: string };
  order_items?: Array<{
    id: string;
    quantity: number;
    price: number;
    menu_item?: { id: string; name: string; amharic_name?: string };
  }>;
}

export default function GuestTableOrderingPage({
  params,
}: {
  params: Promise<{ tableCode: string }>;
}) {
  const resolvedParams = use(params);
  const tableCode = resolvedParams.tableCode;

  const [table, setTable] = useState<DiningTable | null>(null);
  const [session, setSession] = useState<TableSession | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [tableStatusState, setTableStatusState] = useState<string>('available');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);

  // Live order tracker state
  const [activeOrder, setActiveOrder] = useState<ActiveOrderInfo | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  // 1. Fetch table and session state from server
  const loadTableAndSession = useCallback(async () => {
    setLoadingTable(true);
    setTableError(null);

    // Retrieve locally stored session token for this table code
    const storedSessionToken = typeof window !== 'undefined'
      ? localStorage.getItem(`tule_session_${tableCode}`)
      : null;

    try {
      const url = new URL('/api/dining-tables/session', window.location.origin);
      url.searchParams.set('tableToken', tableCode);
      if (storedSessionToken) {
        url.searchParams.set('sessionToken', storedSessionToken);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok || !data.success || !data.table) {
        setTableError(data.error || 'Dining table not found.');
        setTable(null);
      } else {
        setTable(data.table);
        setTableStatusState(data.table.status);

        if (data.session) {
          setSession(data.session);
          if (data.session.session_token) {
            localStorage.setItem(`tule_session_${tableCode}`, data.session.session_token);
          }
        }

        // If there are existing active orders in this session, pick the latest
        if (data.orders && data.orders.length > 0) {
          setActiveOrder(data.orders[0]);
        }
      }
    } catch {
      setTableError('Network error connecting to table service.');
    } finally {
      setLoadingTable(false);
    }
  }, [tableCode]);

  useEffect(() => {
    loadTableAndSession();
    getMenuItems().then(setMenuItems).catch(() => {});
  }, [loadTableAndSession]);

  // 2. Realtime subscription to the active order status
  useEffect(() => {
    if (!activeOrder?.id) return;

    const channel = supabase
      .channel(`live-table-order-${activeOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrder.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            setActiveOrder((prev) => (prev ? { ...prev, status_id: payload.new.status_id } : null));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  // Cart controls
  const updateCart = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const currentQty = next[itemId] || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) delete next[itemId];
      else next[itemId] = newQty;
      return next;
    });
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCat = activeCategory === 'All' || item.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.amharicName && item.amharicName.includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menuItems.find((i) => i.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [cart, menuItems]);

  // Handle Order Submit
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCartCount === 0 || !table) return;

    // Check table availability
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      setOrderError(`Table is currently ${table.status}. Orders cannot be placed at this time.`);
      return;
    }

    setIsSubmitting(true);
    setOrderError(null);
    setCancelFeedback(null);

    const storedSessionToken = session?.session_token || (typeof window !== 'undefined' ? localStorage.getItem(`tule_session_${tableCode}`) : null);

    const orderItems = Object.entries(cart).map(([menu_item_id, quantity]) => ({
      menu_item_id,
      quantity,
    }));

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          departmentId: 1, // Restaurant
          tableToken: tableCode,
          sessionToken: storedSessionToken || undefined,
          guestName: guestName.trim() || `Guest at ${table.table_number}`,
          notes: specialNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCart({});
        // Re-load table session to pick up the newly linked order and active session token
        await loadTableAndSession();
      } else {
        setOrderError(json.error || 'Failed to place order. Please call your server.');
      }
    } catch {
      setOrderError('Network error. Please check your connection or call staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Order (Pending only)
  const handleCancelOrder = async () => {
    if (!activeOrder?.id) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setCancellingOrder(true);
    setCancelFeedback(null);

    const result = await cancelGuestItem('order', activeOrder.id);
    if (result.success) {
      setCancelFeedback('Order cancelled successfully.');
      setActiveOrder((prev) => (prev ? { ...prev, status_id: 9 } : null));
    } else {
      setCancelFeedback(result.error || 'Could not cancel order.');
    }
    setCancellingOrder(false);
  };

  // Loading state
  if (loadingTable) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-center p-6">
        <div className="space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-[#0E7480] border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-[#0B252C] uppercase tracking-widest">
            Connecting to Table QR Service...
          </p>
        </div>
      </div>
    );
  }

  // Table Error / Not Found View
  if (!table || tableError) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4 border border-gray-100">
          <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-[#0B252C]">Table Code Not Available</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {tableError || 'This QR code is invalid or not registered in our live resort directory.'}
          </p>
          <Link
            href="/guest/restaurant"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B252C] px-5 py-2.5 text-xs font-bold text-[#F8D77A] shadow-md hover:bg-[#0E7480] transition-colors"
          >
            Browse Restaurant Menu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── BLOCKED TABLE STATES (Cleaning or Out of Service) ───
  if (table.status === 'out_of_service' || table.status === 'cleaning') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4 border border-gray-100">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Ban className="h-6 w-6" />
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
            Table {table.table_number} • {table.status.replace('_', ' ')}
          </span>
          <h2 className="text-xl font-black text-[#0B252C]">Table Currently Unavailable</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {table.status === 'cleaning'
              ? 'Our hospitality team is currently sanitizing and setting this table for you. Please check back shortly.'
              : 'This dining table is currently undergoing maintenance. Please consult our host for an alternate table.'}
          </p>
          <button
            onClick={loadTableAndSession}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B252C] px-5 py-2.5 text-xs font-bold text-[#F8D77A] shadow-md hover:bg-[#0E7480] transition-colors"
          >
            <RotateCw className="h-4 w-4" /> Refresh Table Status
          </button>
        </div>
      </div>
    );
  }

  // ─── BLOCKED TABLE STATE (Occupied by another session) ───
  if (table.status === 'occupied' && !session) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4 border border-gray-100">
          <div className="h-12 w-12 rounded-2xl bg-stone-100 text-[#0B252C] mx-auto flex items-center justify-center">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-stone-700">
            {table.table_number} • Occupied
          </span>
          <h2 className="text-xl font-black text-[#0B252C]">Active Dining Session in Progress</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Table {table.table_number} is currently occupied by another party. If you have been seated here by our team, please ask your server to open a new session.
          </p>
          <button
            onClick={loadTableAndSession}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B252C] px-5 py-2.5 text-xs font-bold text-[#F8D77A] shadow-md hover:bg-[#0E7480] transition-colors"
          >
            <RotateCw className="h-4 w-4" /> Check Status Again
          </button>
        </div>
      </div>
    );
  }

  // ─── REAL ORDER STATUS TRACKER VIEW ───
  if (activeOrder && activeOrder.status_id !== 9) {
    const isPending = activeOrder.status_id === 1;
    const isAccepted = activeOrder.status_id === 7;
    const isPreparing = activeOrder.status_id === 3 || activeOrder.status_id === 8;
    const isReady = activeOrder.status_id === 4;
    const isDelivered = activeOrder.status_id === 5 || activeOrder.status_id === 6;

    // Real status title and subtitle
    let statusTitle = 'Order Placed';
    let statusDesc = 'Your order was sent to the kitchen. Awaiting staff review.';
    let stepPercent = 'w-1/5';

    if (isAccepted) {
      statusTitle = 'Order Accepted';
      statusDesc = 'The kitchen has confirmed your order and scheduled preparation.';
      stepPercent = 'w-2/5';
    } else if (isPreparing) {
      statusTitle = 'Cooking in Kitchen';
      statusDesc = 'Our chefs are currently preparing your fresh lakeside meal.';
      stepPercent = 'w-3/5';
    } else if (isReady) {
      statusTitle = 'Plated & Ready';
      statusDesc = 'Your dishes are freshly plated and being delivered to your table.';
      stepPercent = 'w-4/5';
    } else if (isDelivered) {
      statusTitle = 'Delivered to Table';
      statusDesc = `Delivered to ${table.table_number}. Enjoy your dining experience!`;
      stepPercent = 'w-full';
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 text-center space-y-5 animate-in zoom-in-95">
          <div className="h-16 w-16 rounded-full bg-[#0E7480]/10 text-[#0E7480] mx-auto flex items-center justify-center shadow-inner">
            {isDelivered ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <Clock className="h-8 w-8 animate-pulse" />}
          </div>

          <div className="space-y-1">
            <span className="rounded-full bg-[#0E7480]/10 px-3 py-1 text-[11px] font-black text-[#0E7480]">
              {table.table_number} • {table.section}
            </span>
            <h2 className="text-2xl font-black text-[#0B252C] pt-2">{statusTitle}</h2>
            <p className="text-xs text-gray-500 leading-relaxed">{statusDesc}</p>
          </div>

          {/* Real Live Progress Tracker */}
          <div className="rounded-2xl bg-[#F8FAFC] p-4 text-left border border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#0B252C]">
              <span className="flex items-center gap-1.5 text-[#0E7480]">
                <Sparkles className="h-4 w-4" />
                Live Status Tracker
              </span>
              <span className="text-[#C9902F] font-black">
                {activeOrder.total} ETB
              </span>
            </div>

            {/* Dynamic Step Bar based on real database status */}
            <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r from-[#0E7480] to-[#14919B] rounded-full transition-all duration-500 ${stepPercent}`} />
            </div>

            <div className="grid grid-cols-4 text-[9px] font-black uppercase text-gray-400 tracking-wider text-center pt-1">
              <span className={isPending ? 'text-[#0E7480]' : ''}>Pending</span>
              <span className={isAccepted || isPreparing ? 'text-[#0E7480]' : ''}>Kitchen</span>
              <span className={isReady ? 'text-[#0E7480]' : ''}>Ready</span>
              <span className={isDelivered ? 'text-emerald-600' : ''}>Served</span>
            </div>
          </div>

          {/* Cancel Feedback */}
          {cancelFeedback && (
            <div className="rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-800 border border-amber-200">
              {cancelFeedback}
            </div>
          )}

          {/* Ordered items preview */}
          {activeOrder.order_items && activeOrder.order_items.length > 0 && (
            <div className="rounded-2xl bg-gray-50 p-3 text-left space-y-1.5 border border-gray-100">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Ordered Dishes</p>
              {activeOrder.order_items.map((it) => (
                <div key={it.id} className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>{it.quantity}x {it.menu_item?.name || 'Item'}</span>
                  <span>{it.price * it.quantity} ETB</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setActiveOrder(null)}
              className="w-full rounded-xl bg-[#0B252C] py-3 text-xs font-bold text-[#F8D77A] shadow-md hover:bg-[#0E7480] transition-colors"
            >
              Order Additional Items
            </button>

            {/* CANCEL BUTTON: ONLY while Pending */}
            {isPending && (
              <button
                disabled={cancellingOrder}
                onClick={handleCancelOrder}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-black text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                {cancellingOrder ? 'Cancelling Order...' : 'Cancel This Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN ORDERING MENU VIEW ───
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] pb-28">
      {/* ─── TOP TABLE BANNER ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#0B252C] border border-[#C9902F]/30 p-1 flex items-center justify-center shadow-md">
              <Image
                src="/tule-resort-mark.svg"
                alt="Tule Resort Logo"
                width={34}
                height={34}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#0B252C]">{table.table_number}</span>
                <span className="rounded-full bg-[#0E7480]/10 px-2 py-0.5 text-[9px] font-black text-[#0E7480] border border-[#0E7480]/20">
                  {table.section}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200">
                  Session Active
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Tule Resort &amp; Spa • Lakeside Table Service</p>
            </div>
          </div>

          {/* Cart Icon */}
          {totalCartCount > 0 && (
            <a
              href="#cart-section"
              className="flex items-center gap-2 rounded-full bg-[#0E7480] hover:bg-[#0A5C66] px-4 py-2 text-xs font-black text-white shadow-lg shadow-[#0E7480]/30 animate-bounce transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{totalCartCount}</span>
              <span className="hidden sm:inline">• {subtotal} ETB</span>
            </a>
          )}
        </div>
      </header>

      {/* ─── HERO GREETING ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="rounded-3xl bg-gradient-to-r from-[#0B252C] via-[#0E353F] to-[#0E7480] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#F8D77A] border border-[#C9902F]/30">
              Welcome to Tule Dining
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              You&apos;re ordering from <span className="text-[#F8D77A]">{table.table_number}</span>
            </h1>
            <p className="text-xs text-slate-200">
              Fresh Ethiopian specialties, steaks, lake fish and beverages sent directly to our kitchen.
            </p>
          </div>
        </div>
      </section>

      {/* ─── SEARCH & CATEGORY FILTER ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search dishes, drinks, tibs, burger..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#0E7480] focus:outline-none focus:ring-2 focus:ring-[#0E7480]/20 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-[#F97316] text-white shadow-md shadow-[#F97316]/25 border border-[#EA580C]'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ─── MENU ITEMS GRID ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div
                key={item.id}
                className="rounded-3xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group hover:border-[#F97316]/40 hover:-translate-y-1"
              >
                <div>
                  <div
                    className="h-40 w-full rounded-2xl bg-gray-100 bg-cover bg-center mb-3 relative overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]"
                    style={{
                      backgroundImage: `url(${item.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'})`,
                    }}
                  >
                    <div className="absolute top-2 right-2 rounded-full bg-[#092B33]/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-black text-[#FB923C] border border-[#F97316]/40 shadow-xs transition-transform duration-300 group-hover:scale-105">
                      {item.price} ETB
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 group-hover:text-[#F97316] transition-colors">
                      {item.name}
                    </h3>
                    {item.amharicName && (
                      <p className="text-xs font-bold text-[#EA580C]">{item.amharicName}</p>
                    )}
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">{item.price} ETB</span>

                  {qty > 0 ? (
                    <div className="flex items-center gap-2 bg-[#F97316]/10 rounded-xl p-1 border border-[#F97316]/30">
                      <button
                        onClick={() => updateCart(item.id, -1)}
                        className="h-7 w-7 rounded-lg bg-white text-[#F97316] font-black flex items-center justify-center shadow-xs hover:bg-gray-50 transition-all duration-150 active:scale-90"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs font-black text-gray-900 px-1">{qty}</span>
                      <button
                        onClick={() => updateCart(item.id, 1)}
                        className="h-7 w-7 rounded-lg bg-[#F97316] text-white font-black flex items-center justify-center shadow-xs hover:bg-[#EA580C] transition-all duration-150 active:scale-90"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateCart(item.id, 1)}
                      className="rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs flex items-center gap-1.5 border border-[#F97316]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CART & CHECKOUT DRAWER (Bottom Bar) ─── */}
      {totalCartCount > 0 && (
        <section
          id="cart-section"
          className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 shadow-2xl"
        >
          <div className="max-w-2xl mx-auto space-y-3">
            {orderError && (
              <div className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 border border-red-200 text-center">
                {orderError}
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-bold">
              <span>Ordering for: <strong className="text-[#0E7480]">{table.table_number}</strong></span>
              <span className="text-base font-black text-[#0B252C]">Total: <span className="text-[#C9902F]">{subtotal} ETB</span></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Your Name (Optional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#0E7480] focus:outline-none"
              />
              <input
                type="text"
                placeholder="Special kitchen notes (Optional)"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#0E7480] focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gradient-to-r from-[#0B252C] via-[#0E353F] to-[#0E7480] py-3.5 text-xs font-black uppercase tracking-wider text-[#F8D77A] shadow-xl shadow-[#0B252C]/30 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 border border-[#C9902F]/30"
            >
              <CheckCircle2 className="h-4 w-4 text-[#F8D77A]" />
              {isSubmitting ? 'Sending to Kitchen...' : `Place Order (${subtotal} ETB)`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
