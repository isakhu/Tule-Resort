'use client';

import React, { useState, useEffect, useMemo, use, useCallback, useRef, useId } from 'react';
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
  RotateCw,
  Ban
} from 'lucide-react';
import { getMenuItems, MenuItem } from '@/lib/menu';
import { DiningTable, TableSession } from '@/lib/diningTables';
import { supabase } from '@/lib/supabaseClient';
import { cancelGuestItem } from '@/lib/guestSession';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `table_${Math.random().toString(36).slice(2)}_${Date.now()}`;
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

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);

  // Stable idempotency key across retries and double taps
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>('');

  // Live order tracker state
  const [activeOrder, setActiveOrder] = useState<ActiveOrderInfo | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  const searchInputId = useId();
  const guestNameInputId = useId();
  const specialNotesInputId = useId();

  // 1. Fetch table and session state from server
  const loadTableAndSession = useCallback(async () => {
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

        if (data.session) {
          setSession(data.session);
          if (data.session.session_token && typeof window !== 'undefined') {
            localStorage.setItem(`tule_session_${tableCode}`, data.session.session_token);
          }
        } else {
          setSession(null);
          if (typeof window !== 'undefined' && storedSessionToken) {
            localStorage.removeItem(`tule_session_${tableCode}`);
          }
        }

        // If there are existing non-cancelled orders in this session, pick the latest active one
        const nonCancelledOrders = (data.orders || []).filter((o: ActiveOrderInfo) => o.status_id !== 9);
        if (nonCancelledOrders.length > 0) {
          setActiveOrder(nonCancelledOrders[0]);
        } else {
          setActiveOrder(null);
        }
      }
    } catch {
      setTableError('Network error connecting to table service.');
    } finally {
      setLoadingTable(false);
    }
  }, [tableCode]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadTableAndSession();
    });
    getMenuItems().then(setMenuItems).catch(() => { });
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
        (payload: { new?: { status_id?: number } }) => {
          const nextStatusId = payload.new?.status_id;
          if (typeof nextStatusId === 'number') {
            setActiveOrder((prev) => (prev ? { ...prev, status_id: nextStatusId } : null));
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
    setCheckoutIdempotencyKey(generateIdempotencyKey());
    setCart((prev) => {
      const next = { ...prev };
      const currentQty = next[itemId] || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) delete next[itemId];
      else next[itemId] = newQty;
      return next;
    });
  };

  const isClickScrolling = useRef(false);

  // Helper to generate consistent section id
  const getCatId = (cat: string) => `cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.amharicName && item.amharicName.includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [menuItems, searchQuery]);

  // Group filtered items by category for sectioned view & smooth jumping
  const categorySections = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    categories.filter((c) => c !== 'All').forEach((cat) => map.set(cat, []));

    filteredItems.forEach((item) => {
      const cat = item.category || 'Other';
      const list = map.get(cat) || [];
      list.push(item);
      map.set(cat, list);
    });

    return Array.from(map.entries())
      .filter(([, list]) => list.length > 0)
      .map(([category, list]) => ({
        category,
        id: getCatId(category),
        items: list,
      }));
  }, [filteredItems, categories]);

  // Smooth category jumping
  const handleScrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      const topEl = document.getElementById('table-menu-top');
      if (topEl) {
        topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const catId = getCatId(cat);
    const target = document.getElementById(catId);
    if (target) {
      isClickScrolling.current = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isClickScrolling.current = false;
      }, 800);
    }
  };

  // IntersectionObserver for active pill highlighting as guest scrolls
  useEffect(() => {
    if (searchQuery.trim()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        const visible = entries.find((e) => e.isIntersecting);
        if (visible && visible.target.id) {
          const matched = categorySections.find((s) => s.id === visible.target.id);
          if (matched) {
            setActiveCategory(matched.category);
          }
        }
      },
      {
        rootMargin: '-20% 0px -65% 0px',
        threshold: 0.05,
      }
    );

    categorySections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categorySections, searchQuery]);

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

    const effectiveIdempotencyKey = checkoutIdempotencyKey || generateIdempotencyKey();
    if (!checkoutIdempotencyKey) {
      setCheckoutIdempotencyKey(effectiveIdempotencyKey);
    }

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
          idempotencyKey: effectiveIdempotencyKey,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Persist newly issued or active session token immediately so refresh & re-orders never lock out
        if (json.sessionToken && typeof window !== 'undefined') {
          localStorage.setItem(`tule_session_${tableCode}`, json.sessionToken);
          setSession((prev) =>
            prev ?? {
              id: json.tableSessionId || '',
              table_id: table.id,
              session_token: json.sessionToken,
              status: 'active',
              guest_name: guestName.trim() || `Guest at ${table.table_number}`,
              opened_at: new Date().toISOString(),
            },
          );
        }

        // Regenerate for the next order
        setCheckoutIdempotencyKey(generateIdempotencyKey());
        setCart({});
        // Re-load table session to pick up the newly linked order and active session state
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
  const confirmCancelOrder = async () => {
    if (!activeOrder?.id) return;

    setCancellingOrder(true);
    setCancelFeedback(null);

    const storedSessionToken = session?.session_token || (typeof window !== 'undefined' ? localStorage.getItem(`tule_session_${tableCode}`) : null);
    const result = await cancelGuestItem('order', activeOrder.id, storedSessionToken || undefined);
    setCancellingOrder(false);
    setConfirmCancelOpen(false);
    if (result.success) {
      setCancelFeedback('Order cancelled successfully.');
      setActiveOrder((prev) => (prev ? { ...prev, status_id: 9 } : null));
    } else {
      setCancelFeedback(result.error || 'Could not cancel order.');
    }
  };

  // Loading state
  if (loadingTable) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] flex items-center justify-center text-center p-6">
        <div className="space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-[#163D32] border-t-transparent animate-spin" />
          <h1 className="text-xs font-bold text-[#163D32] uppercase tracking-widest">
            Connecting to Table QR Service...
          </h1>
        </div>
      </main>
    );
  }

  // Table Error / Not Found View
  if (!table || tableError) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4 border border-[#E6DFD1]">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-700 mx-auto flex items-center justify-center">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#163D32]">Table Code Not Available</h1>
          <p className="text-xs text-[#52645D] leading-relaxed">
            {tableError || 'This QR code is invalid or not registered in our live resort directory.'}
          </p>
          <Link
            href="/guest/restaurant"
            className="inline-flex items-center gap-2 rounded-xl bg-[#163D32] px-5 py-2.5 text-xs font-bold text-[#C5A46D] shadow-md hover:bg-[#0F2D24] transition-colors"
          >
            Browse Restaurant Menu <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </main>
    );
  }

  // ─── BLOCKED TABLE STATES (Cleaning or Out of Service) ───
  if (table.status === 'out_of_service' || table.status === 'cleaning') {
    return (
      <main className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4 border border-[#E6DFD1]">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <Ban className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-900">
            Table {table.table_number} • {table.status.replace('_', ' ')}
          </span>
          <h1 className="font-display text-2xl font-semibold text-[#163D32]">Table Currently Unavailable</h1>
          <p className="text-xs text-[#52645D] leading-relaxed">
            {table.status === 'cleaning'
              ? 'Our hospitality team is currently sanitizing and setting this table for you. Please check back shortly.'
              : 'This dining table is currently undergoing maintenance. Please consult our host for an alternate table.'}
          </p>
          <button
            type="button"
            onClick={() => void loadTableAndSession()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#163D32] px-5 py-2.5 text-xs font-bold text-[#C5A46D] shadow-md hover:bg-[#0F2D24] transition-colors"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" /> Refresh Table Status
          </button>
        </div>
      </main>
    );
  }

  // ─── BLOCKED TABLE STATE (Occupied by another session) ───
  if (table.status === 'occupied' && !session) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4 border border-[#E6DFD1]">
          <div className="h-12 w-12 rounded-2xl bg-[#F5F0E6] text-[#163D32] mx-auto flex items-center justify-center">
            <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="inline-block rounded-full bg-[#F5F0E6] border border-[#E6DFD1] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#52645D]">
            {table.table_number} • Occupied
          </span>
          <h1 className="font-display text-2xl font-semibold text-[#163D32]">Active Dining Session in Progress</h1>
          <p className="text-xs text-[#52645D] leading-relaxed">
            Table {table.table_number} is currently occupied by another party. If you have been seated here by our team, please ask your server to open a new session.
          </p>
          <button
            type="button"
            onClick={() => void loadTableAndSession()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#163D32] px-5 py-2.5 text-xs font-bold text-[#C5A46D] shadow-md hover:bg-[#0F2D24] transition-colors"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" /> Check Status Again
          </button>
        </div>
      </main>
    );
  }

  // ─── REAL ORDER STATUS TRACKER VIEW ───
  if (activeOrder && activeOrder.status_id !== 9) {
    const isPending = activeOrder.status_id === 1;
    const isAccepted = activeOrder.status_id === 7;
    const isPreparing = activeOrder.status_id === 3 || activeOrder.status_id === 8;
    const isReady = activeOrder.status_id === 4;
    const isDelivered = activeOrder.status_id === 5 || activeOrder.status_id === 6;

    // Real status title and subtitle (4 aligned stages)
    let statusTitle = 'Order Placed';
    let statusDesc = 'Your order was sent to the kitchen. Awaiting staff review.';
    let stepPercent = 'w-1/4';

    if (isAccepted || isPreparing) {
      statusTitle = isAccepted ? 'Order Accepted' : 'Cooking in Kitchen';
      statusDesc = isAccepted
        ? 'The kitchen has confirmed your order and scheduled preparation.'
        : 'Our chefs are currently preparing your fresh lakeside meal.';
      stepPercent = 'w-2/4';
    } else if (isReady) {
      statusTitle = 'Plated & Ready';
      statusDesc = 'Your dishes are freshly plated and being delivered to your table.';
      stepPercent = 'w-3/4';
    } else if (isDelivered) {
      statusTitle = 'Delivered to Table';
      statusDesc = `Delivered to ${table.table_number}. Enjoy your dining experience!`;
      stepPercent = 'w-full';
    }

    return (
      <main className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#E6DFD1] text-center space-y-5 animate-in zoom-in-95">
          <div className="h-16 w-16 rounded-full bg-[#163D32]/10 text-[#163D32] mx-auto flex items-center justify-center shadow-inner">
            {isDelivered ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            ) : (
              <Clock className="h-8 w-8 text-[#163D32]" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1">
            <span className="inline-block rounded-full bg-[#163D32]/10 px-3 py-1 text-[11px] font-bold text-[#163D32]">
              {table.table_number} • {table.section}
            </span>
            <h1 className="font-display text-2xl font-semibold text-[#163D32] pt-2">{statusTitle}</h1>
            <p className="text-xs text-[#52645D] leading-relaxed">{statusDesc}</p>
          </div>

          {/* Real Live Progress Tracker */}
          <div className="rounded-2xl bg-[#F5F0E6] p-4 text-left border border-[#E6DFD1] space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#163D32]">
              <span className="flex items-center gap-1.5 text-[#163D32]">
                <Sparkles className="h-4 w-4 text-[#7A5A27]" aria-hidden="true" />
                Live Status Tracker
              </span>
              <span className="text-[#7A5A27] font-black">
                {Number(activeOrder.total).toLocaleString()} ETB
              </span>
            </div>

            {/* Dynamic Step Bar based on real database status */}
            <div className="h-2.5 w-full bg-[#E6DFD1] rounded-full overflow-hidden">
              <div className={`h-full bg-[#163D32] rounded-full transition-all duration-500 ${stepPercent}`} />
            </div>

            <div className="grid grid-cols-4 text-[10px] font-bold uppercase text-[#52645D] tracking-wider text-center pt-1">
              <span className={isPending ? 'text-[#163D32] font-extrabold' : ''}>Pending</span>
              <span className={isAccepted || isPreparing ? 'text-[#163D32] font-extrabold' : ''}>Kitchen</span>
              <span className={isReady ? 'text-[#163D32] font-extrabold' : ''}>Ready</span>
              <span className={isDelivered ? 'text-emerald-800 font-extrabold' : ''}>Served</span>
            </div>
          </div>

          {/* Cancel Feedback */}
          {cancelFeedback && (
            <div role="status" className="rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-900 border border-amber-200">
              {cancelFeedback}
            </div>
          )}

          {/* Ordered items preview */}
          {activeOrder.order_items && activeOrder.order_items.length > 0 && (
            <div className="rounded-2xl bg-[#F5F0E6]/65 p-3.5 text-left space-y-1.5 border border-[#E6DFD1]">
              <p className="text-[11px] font-bold uppercase text-[#7A5A27] tracking-wider">Ordered Dishes</p>
              {activeOrder.order_items.map((it) => (
                <div key={it.id} className="flex justify-between text-xs font-semibold text-[#163D32]">
                  <span>{it.quantity}x {it.menu_item?.name || 'Item'}</span>
                  <span>{(it.price * it.quantity).toLocaleString()} ETB</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveOrder(null)}
              className="w-full rounded-xl bg-[#163D32] py-3 text-xs font-bold text-[#C5A46D] shadow-md hover:bg-[#0F2D24] transition-colors"
            >
              Order Additional Items
            </button>

            {/* CANCEL BUTTON: ONLY while Pending */}
            {isPending && (
              <button
                type="button"
                disabled={cancellingOrder}
                onClick={() => setConfirmCancelOpen(true)}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                {cancellingOrder ? 'Cancelling Order...' : 'Cancel This Order'}
              </button>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={confirmCancelOpen}
          title="Cancel Dining Order?"
          description="Are you sure you want to cancel your pending table order? Once kitchen staff accept the order, cancellations require server assistance."
          confirmLabel="Yes, Cancel Order"
          tone="danger"
          busy={cancellingOrder}
          onConfirm={() => void confirmCancelOrder()}
          onCancel={() => {
            if (!cancellingOrder) setConfirmCancelOpen(false);
          }}
        />
      </main>
    );
  }

  // ─── MAIN ORDERING MENU VIEW ───
  return (
    <div className={`min-h-screen bg-[#F5F0E6] text-[#1A1A1A] ${totalCartCount > 0 ? 'pb-52 sm:pb-44' : 'pb-16'}`}>
      {/* ─── TOP TABLE BANNER ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E6DFD1] shadow-xs px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#163D32] border border-[#C5A46D]/30 p-1 flex items-center justify-center shadow-md shrink-0">
              <Image
                src="/tule-resort-logo.png"
                alt="Tule Resort Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-[#163D32]">{table.table_number}</span>
                <span className="rounded-full bg-[#163D32]/10 px-2 py-0.5 text-[10px] font-bold text-[#163D32] border border-[#163D32]/20">
                  {table.section}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  Session Active
                </span>
              </div>
              <p className="text-[11px] text-[#52645D] font-medium">Tule Resort &amp; Spa • Lakeside Table Service</p>
            </div>
          </div>

          {/* Cart Icon */}
          {totalCartCount > 0 && (
            <a
              href="#cart-section"
              className="flex items-center gap-2 rounded-full bg-[#163D32] hover:bg-[#0F2D24] px-4 py-2 text-xs font-bold text-[#C5A46D] shadow-lg shadow-[#163D32]/25 transition-all hover:scale-[1.03]"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span>{totalCartCount}</span>
              <span className="hidden sm:inline">• {subtotal.toLocaleString()} ETB</span>
            </a>
          )}
        </div>
      </header>

      <main>
        {/* ─── HERO GREETING ─── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <div className="rounded-3xl bg-gradient-to-r from-[#163D32] via-[#0F2D24] to-[#163D32] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-xl space-y-2">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#C5A46D] border border-[#C5A46D]/30">
                Welcome to Tule Dining
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
                You&apos;re ordering from <span className="text-[#C5A46D]">{table.table_number}</span>
              </h1>
              <p className="text-xs text-[#F5F0E6]/85">
                Fresh Ethiopian specialties, steaks, lake fish, and beverages sent directly to our kitchen.
              </p>
            </div>
          </div>
        </section>

        {/* ─── SEARCH BAR ─── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <div className="relative">
            <label htmlFor={searchInputId} className="sr-only">
              Search menu dishes and beverages
            </label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52645D]" aria-hidden="true" />
            <input
              id={searchInputId}
              type="text"
              placeholder="Search dishes, drinks, tibs, burger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#E6DFD1] bg-white py-3 pl-11 pr-4 text-xs font-semibold text-[#1A1A1A] placeholder-[#52645D]/70 focus:border-[#163D32] focus:outline-none focus:ring-2 focus:ring-[#163D32]/15 shadow-xs"
            />
          </div>
        </section>

        {/* ─── STICKY HORIZONTAL CATEGORY PILL-BAR ─── */}
        <nav
          aria-label="Menu Categories"
          className="sticky top-[68px] z-20 backdrop-blur-md bg-[#F5F0E6]/90 py-2 px-4 sm:px-6 border-b border-[#E6DFD1] shadow-2xs mt-4"
        >
          <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleScrollToCategory(cat)}
                  className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer ${isActive
                      ? 'bg-[#163D32] text-[#C5A46D] shadow-md ring-1 ring-[#163D32]'
                      : 'bg-white text-[#163D32] hover:bg-[#163D32]/5 border border-[#E6DFD1] shadow-2xs'
                    }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </nav>

        <div id="table-menu-top" className="scroll-mt-32" />

        {/* ─── CATEGORY SECTIONED MENU ITEMS GRID ─── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-10">
          {filteredItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E6DFD1] bg-white p-12 text-center text-[#52645D]">
              <UtensilsCrossed className="mx-auto h-12 w-12 text-[#7A5A27]/50 mb-3" aria-hidden="true" />
              <p className="text-sm font-bold text-[#163D32]">No dishes found matching &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-[#52645D] mt-1">Try another search term or choose a category above.</p>
            </div>
          ) : (
            categorySections.map((section) => (
              <div key={section.id} id={section.id} className="scroll-mt-36 space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-[#E6DFD1] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#C5A46D]" />
                    <h2 className="font-display text-lg sm:text-xl font-semibold text-[#163D32] tracking-tight">
                      {section.category}
                    </h2>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#7A5A27] border border-[#E6DFD1]">
                      {section.items.length}
                    </span>
                  </div>
                </div>

                {/* Items Grid for this category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl bg-white p-4 shadow-sm border border-[#E6DFD1] flex flex-col justify-between hover:shadow-xl transition-all duration-300 group hover:border-[#C5A46D]/60 hover:-translate-y-1"
                      >
                        <div>
                          <div
                            className="h-40 w-full rounded-2xl bg-[#F5F0E6] bg-cover bg-center mb-3 relative overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]"
                            style={{
                              backgroundImage: `url(${item.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'})`,
                            }}
                          >
                            <div className="absolute top-2 right-2 rounded-full bg-[#0F2D24]/92 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-[#F5F0E6] border border-[#C5A46D]/40 shadow-xs transition-transform duration-300 group-hover:scale-105">
                              {item.price.toLocaleString()} ETB
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-extrabold text-[#163D32] group-hover:text-[#7A5A27] transition-colors">
                              {item.name}
                            </h3>
                            {item.amharicName && (
                              <p className="text-xs font-bold text-[#7A5A27]">{item.amharicName}</p>
                            )}
                            <p className="text-[11px] text-[#52645D] line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#E6DFD1] flex items-center justify-between">
                          <span className="text-xs font-black text-[#163D32]">{item.price.toLocaleString()} ETB</span>

                          {qty > 0 ? (
                            <div className="flex items-center gap-2 bg-[#F5F0E6] rounded-xl p-1 border border-[#E6DFD1]">
                              <button
                                type="button"
                                aria-label={`Decrease quantity of ${item.name}`}
                                onClick={() => updateCart(item.id, -1)}
                                className="h-7 w-7 rounded-lg bg-white text-[#163D32] font-black flex items-center justify-center shadow-xs hover:bg-[#163D32]/10 transition-all duration-150 active:scale-90"
                              >
                                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <span className="text-xs font-black text-[#163D32] px-1">{qty}</span>
                              <button
                                type="button"
                                aria-label={`Increase quantity of ${item.name}`}
                                onClick={() => updateCart(item.id, 1)}
                                className="h-7 w-7 rounded-lg bg-[#163D32] text-[#C5A46D] font-black flex items-center justify-center shadow-xs hover:bg-[#0F2D24] transition-all duration-150 active:scale-90"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateCart(item.id, 1)}
                              className="rounded-xl bg-[#163D32] hover:bg-[#0F2D24] text-[#F5F0E6] px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs flex items-center gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5 text-[#C5A46D]" aria-hidden="true" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* ─── CART & CHECKOUT DRAWER (Bottom Bar) ─── */}
      {totalCartCount > 0 && (
        <section
          id="cart-section"
          className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E6DFD1] p-4 shadow-2xl"
        >
          <form onSubmit={handleSubmitOrder} className="max-w-2xl mx-auto space-y-3">
            {orderError && (
              <div role="alert" className="rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-800 border border-rose-200 text-center">
                {orderError}
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-bold text-[#1A1A1A]">
              <span>Ordering for: <strong className="text-[#163D32]">{table.table_number}</strong></span>
              <span className="text-base font-black text-[#163D32]">
                Total: <span className="text-[#7A5A27]">{subtotal.toLocaleString()} ETB</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor={guestNameInputId} className="sr-only">
                  Your Name (Optional)
                </label>
                <input
                  id={guestNameInputId}
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/40 px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#52645D]/70 focus:border-[#163D32] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={specialNotesInputId} className="sr-only">
                  Special kitchen notes (Optional)
                </label>
                <input
                  id={specialNotesInputId}
                  type="text"
                  placeholder="Special kitchen notes (Optional)"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#E6DFD1] bg-[#F5F0E6]/40 px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#52645D]/70 focus:border-[#163D32] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gradient-to-r from-[#163D32] via-[#0F2D24] to-[#163D32] py-3.5 text-xs font-extrabold uppercase tracking-wider text-[#C5A46D] shadow-xl shadow-[#163D32]/30 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 border border-[#C5A46D]/30"
            >
              <CheckCircle2 className="h-4 w-4 text-[#C5A46D]" aria-hidden="true" />
              {isSubmitting ? 'Sending to Kitchen...' : `Place Order (${subtotal.toLocaleString()} ETB)`}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
