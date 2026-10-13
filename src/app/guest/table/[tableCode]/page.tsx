'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Layers,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  ChefHat
} from 'lucide-react';
import type { MenuItem } from '@/lib/menu';
import { getDiningTableByToken, DiningTable } from '@/lib/diningTables';
import { createOrder } from '@/lib/orders';

export default function GuestTableOrderingPage({
  params,
}: {
  params: Promise<{ tableCode: string }>;
}) {
  const resolvedParams = use(params);
  const tableCode = resolvedParams.tableCode;

  const [table, setTable] = useState<DiningTable | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch table by token
    getDiningTableByToken(tableCode).then((found) => {
      setTable(found);
      setLoadingTable(false);
    });

    // Load only database-backed current menu records. Never show static demo
    // items as if they could be ordered from a live table.
    let cancelled = false;
    fetch('/api/menu', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload.success !== true || !Array.isArray(payload.items)) {
          throw new Error(payload.error || 'The menu is temporarily unavailable.');
        }
        if (!cancelled) setMenuItems(payload.items as MenuItem[]);
      })
      .catch(() => {
        if (!cancelled) setMenuError('The current menu is temporarily unavailable. Please ask a member of staff for help.');
      })
      .finally(() => {
        if (!cancelled) setLoadingMenu(false);
      });

    return () => { cancelled = true; };
  }, [tableCode]);

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

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCartCount === 0) return;
    setIsSubmitting(true);
    setOrderError(null);

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
          guestName: guestName.trim() || `Guest at ${table?.table_number || 'Table'}`,
          notes: specialNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && typeof json.orderId === 'string' && json.orderId) {
        setSubmittedOrderId(json.orderId);
        setCart({});
      } else {
        setOrderError(json.error || 'Failed to place order. Please call your server.');
      }
    } catch {
      setOrderError('Network error. Please check your connection or call staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingTable) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center text-center p-6">
        <div className="space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-[#FF6B00] border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Connecting to Table...
          </p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-4 border border-gray-100">
          <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Table Code Not Found</h2>
          <p className="text-xs text-gray-500">
            This QR code may have expired or is not currently active. You can still browse our resort menu below.
          </p>
          <Link
            href="/guest/restaurant"
            className="inline-flex items-center gap-2 rounded-xl bg-[#073B4C] px-5 py-2.5 text-xs font-bold text-white shadow-md"
          >
            Browse Restaurant Menu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (menuError) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-xl text-center space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-[#FF6B00]" />
          <h1 className="text-xl font-black text-gray-900">Menu temporarily unavailable</h1>
          <p className="text-sm text-gray-500">{menuError}</p>
          <button onClick={() => window.location.reload()} className="rounded-xl bg-[#073B4C] px-5 py-3 text-sm font-bold text-white">Try again</button>
        </div>
      </div>
    );
  }

  // ─── ORDER CONFIRMATION VIEW ───
  if (submittedOrderId) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-2xl border border-orange-100 text-center space-y-5 animate-in zoom-in-95">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black text-[#FF6B00]">
              {table.table_number} • {table.section}
            </span>
            <h2 className="text-2xl font-black text-gray-900 pt-2">Order Received</h2>
            <p className="text-xs text-gray-500">
              Your order has been received by the resort system. The service team will process it shortly.
            </p>
          </div>

          {/* Progress Tracker */}
          <div className="rounded-2xl bg-[#F8F9FA] p-4 text-left border border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-gray-800">
              <span className="flex items-center gap-1.5 text-[#FF6B00]">
                <Clock className="h-4 w-4" />
                Order submitted
              </span>
              <span>Reference</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FA812F] rounded-full w-2/5 animate-pulse" />
            </div>
            <p className="text-[10px] text-gray-500">
              Please keep this order reference if you need help from the service team.
            </p>
          </div>

          <button
            onClick={() => setSubmittedOrderId(null)}
            className="w-full rounded-xl bg-[#073B4C] py-3 text-xs font-bold text-white shadow-md hover:bg-[#0B4F6C]"
          >
            Order Additional Items
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#1E293B] pb-28">
      {/* ─── TOP TABLE BANNER ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-xs px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center font-black shadow-md shadow-orange-500/20">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-900">{table.table_number}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200">
                  {table.section}
                </span>
              </div>
              <p className="text-[10px] text-gray-500">Tule Resort &amp; Spa • Table Ordering</p>
            </div>
          </div>

          {/* Cart Icon */}
          {totalCartCount > 0 && (
            <a
              href="#cart-section"
              className="flex items-center gap-2 rounded-full bg-[#FF6B00] px-4 py-2 text-xs font-black text-white shadow-lg shadow-orange-500/30 animate-bounce"
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
        <div className="rounded-3xl bg-gradient-to-r from-[#073B4C] via-[#0B4F6C] to-[#159A9C] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl space-y-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-teal-200">
              Welcome to Tule Dining
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              You&apos;re ordering from <span className="text-[#FF6B00]">{table.table_number}</span>
            </h1>
            <p className="text-xs text-teal-100">
              Browse our fresh Ethiopian specialties, steaks, lake fish and drinks. All orders go straight to the kitchen.
            </p>
          </div>
        </div>
      </section>

      {loadingMenu ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 text-sm text-gray-500">Loading the current menu…</div>
      ) : null}

      {/* ─── SEARCH & CATEGORY FILTER ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search dishes, drinks, tibs, burger..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-orange-200/80 bg-white py-3 pl-11 pr-4 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 shadow-xs"
          />
        </div>

        {/* Categories scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-100'
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
                className="rounded-3xl bg-white p-4 shadow-sm border border-orange-100 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {/* Image */}
                  <div
                    className="h-40 w-full rounded-2xl bg-gray-100 bg-cover bg-center mb-3 relative overflow-hidden"
                    style={{
                      backgroundImage: `url(${item.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'})`,
                    }}
                  >
                    <div className="absolute top-2 right-2 rounded-full bg-[#11161B]/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-black text-white">
                      {item.price} ETB
                    </div>
                  </div>

                  {/* Titles */}
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B00] transition-colors">
                      {item.name}
                    </h3>
                    {item.amharicName && (
                      <p className="text-xs font-bold text-[#FF6B00]">{item.amharicName}</p>
                    )}
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Add to Cart Bar */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">{item.price} ETB</span>

                  {qty > 0 ? (
                    <div className="flex items-center gap-2 bg-orange-50 rounded-xl p-1 border border-orange-200">
                      <button
                        onClick={() => updateCart(item.id, -1)}
                        className="h-7 w-7 rounded-lg bg-white text-[#FF6B00] font-black flex items-center justify-center shadow-xs"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs font-black text-gray-900 px-1">{qty}</span>
                      <button
                        onClick={() => updateCart(item.id, 1)}
                        className="h-7 w-7 rounded-lg bg-[#FF6B00] text-white font-black flex items-center justify-center shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateCart(item.id, 1)}
                      className="rounded-xl bg-[#073B4C] hover:bg-[#FF6B00] text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
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
          className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-orange-200 p-4 shadow-2xl"
        >
          <div className="max-w-2xl mx-auto space-y-3">
            {orderError && (
              <div className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 border border-red-200 text-center">
                {orderError}
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-bold">
              <span>Ordering for: <strong className="text-[#FF6B00]">{table.table_number}</strong></span>
              <span className="text-base font-black text-gray-900">Total: {subtotal} ETB</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Your Name (Optional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
              />
              <input
                type="text"
                placeholder="Special kitchen notes (Optional)"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#FF6B00] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-orange-500/30 hover:bg-[#E85D04] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Sending to Kitchen...' : `Place Order (${subtotal} ETB)`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
