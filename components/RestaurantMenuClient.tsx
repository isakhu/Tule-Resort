'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Minus, Phone, Plus, Search, ShoppingBag, Sparkles, UtensilsCrossed } from 'lucide-react';
import type { MenuItem } from '@/lib/menu';

function FlowerPriceBadge({ price }: { price: number }) {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center select-none transition-transform hover:scale-105">
      <svg viewBox="0 0 100 100" className="h-full w-full text-[#C9902F] drop-shadow-[0_4px_10px_rgba(201,144,47,0.35)]" fill="currentColor">
        <path d="M50 3 C53.5 3 56.5 9 60.5 10 C64.5 11 69 7.5 72.5 9.5 C76 11.5 77 18 80.5 21 C84 24 90 23.5 92.5 27 C95 30.5 93 36.5 94.5 40.5 C96 44.5 100 47.5 100 51.5 C100 55.5 96 58.5 94.5 62.5 C93 66.5 95 72.5 92.5 76 C90 79.5 84 79 80.5 82 C77 85 76 91.5 72.5 93.5 C69 95.5 64.5 92 60.5 93 C56.5 94 53.5 100 50 100 C46.5 100 43.5 94 39.5 93 C35.5 92 31 95.5 27.5 93.5 C24 91.5 23 85 19.5 82 C16 79 10 79.5 7.5 76 C5 72.5 7 66.5 5.5 62.5 C4 58.5 0 55.5 0 51.5 C0 47.5 4 44.5 5.5 40.5 C7 36.5 5 30.5 7.5 27 C10 23.5 16 24 19.5 21 C23 18 24 11.5 27.5 9.5 C31 7.5 35.5 11 39.5 10 C43.5 9 46.5 3 50 3 Z" />
      </svg>
      <div className="absolute text-center leading-none text-white pointer-events-none">
        <span className="block text-sm font-black tracking-tight">{price}</span>
        <span className="block text-[7px] font-extrabold uppercase opacity-95">ETB</span>
      </div>
    </div>
  );
}

const CATEGORY_TABS = [
  'All',
  'Fast Food & Bowls',
  'Beef & Lamb',
  'Poultry & Fish',
  'Vegetarian & Vegan',
  'Breakfast',
  'Modern & Intercontinental',
  'Sides & Appetizers',
  'Desserts & Sweets',
  'Beverages',
] as const;

export default function RestaurantMenuClient({ items }: { items: MenuItem[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  // Restore the customer's bag after a refresh without reading localStorage
  // during the server render (which would cause a hydration mismatch).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('tule-resort-cart')
        ?? window.localStorage.getItem('haile-resort-cart');
      if (!saved) return;

      const parsed: unknown = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

      const restored = Object.entries(parsed).reduce<Record<string, number>>((next, [id, value]) => {
        const quantity = Number(value);
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 50) {
          next[id] = quantity;
        }
        return next;
      }, {});
      setCart(restored);
    } catch {
      setCart({});
    }
  }, []);

  const changeQuantity = (id: string, delta: number) => {
    setCart((current) => {
      const next = { ...current };
      const quantity = Math.max(0, (next[id] ?? 0) + delta);
      if (quantity === 0) {
        delete next[id];
      } else {
        next[id] = quantity;
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tule-resort-cart', JSON.stringify(next));
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Keep sold-out/inactive menu entries out of the guest ordering path.
      const matchesAvailability = item.isAvailable !== false;
      const matchesCategory =
        activeCategory === 'All' ||
        item.category.toLowerCase().includes(activeCategory.toLowerCase()) ||
        (activeCategory === 'Fast Food & Bowls' && (item.category.includes('Fast') || item.category.includes('Bowls') || Number(item.id) >= 101 && Number(item.id) <= 120)) ||
        (activeCategory === 'Modern & Intercontinental' && (item.category.includes('Modern') || item.category.includes('Pizza') || item.category.includes('Pasta')));

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.amharicName.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesAvailability && matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  // If viewing All and not searching, show featured first unless expanded
  const displayItems = useMemo(() => {
    if (searchQuery.trim() || activeCategory !== 'All' || showAll) {
      return filteredItems;
    }
    return filteredItems.slice(0, 18);
  }, [filteredItems, searchQuery, activeCategory, showAll]);

  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const totalAmount = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = items.find((i) => i.id === id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [cart, items]);

  return (
    <main id="menu" className="relative min-h-screen bg-[#F4F7F8] pb-28 pt-8 text-[#1E293B]">
      {/* Top Banner & Search */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0B252C] via-[#0E353F] to-[#041216] p-6 text-white shadow-2xl md:p-10 border border-white/10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#18A0A8]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#C9902F]/15 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tule-resort-mark.svg"
                    alt="Tule Resort Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#C9902F]/40 bg-[#C9902F]/15 px-3.5 py-1 text-[10px] font-black uppercase tracking-[.22em] text-[#F8D77A] backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-[#F8D77A]" />
                  Tule Resort Lakeside Dining ({items.length} Specialties)
                </span>
              </div>
              <h2 className="font-black text-3xl tracking-tight sm:text-4xl md:text-5xl uppercase leading-none font-serif">
                FRESH. FLAVORFUL.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8D77A] via-[#C9902F] to-[#18A0A8]">
                  LAKESIDE GASTRONOMY.
                </span>
              </h2>
              <p className="text-xs text-teal-100/80 sm:text-sm leading-relaxed">
                Explore our full culinary collection from authentic Ethiopian favorites and sizzling clay-pot tibs to fresh Lake Hawassa tilapia, woodfired pizzas, and artisan beverages.
              </p>
            </div>

            {/* Quick Live Order Counter Pill */}
            {totalItems > 0 && (
              <Link
                href="/guest/order"
                className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#C9902F] to-[#E5B558] px-6 py-3.5 text-xs font-black uppercase tracking-[.14em] text-[#0B252C] shadow-xl transition hover:scale-105 active:scale-95 shrink-0"
              >
                <ShoppingBag className="h-4 w-4 text-[#0B252C]" />
                Review Order ({totalItems} items · {totalAmount.toLocaleString()} ETB)
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Search Bar inside banner */}
          <div className="relative mt-8">
            <div className="relative flex items-center">
              <Search className="absolute left-5 h-5 w-5 text-[#0E7480]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all dishes & drinks (e.g. Tibs, Tilapia, Kitfo, Boba, Pizza, Burger, Coffee...)"
                className="w-full rounded-full border-2 border-white/20 bg-white py-4 pl-14 pr-6 text-sm font-bold text-[#182326] placeholder:text-gray-400 shadow-lg outline-none transition focus:border-[#0E7480] focus:ring-4 focus:ring-[#0E7480]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 text-xs font-black uppercase text-stone-400 hover:text-stone-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills Navigation */}
      <section className="sticky top-0 z-30 mx-auto mt-6 max-w-7xl px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveCategory(tab);
                  setShowAll(true);
                }}
                className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0E7480] to-[#14919B] text-white shadow-md shadow-[#0E7480]/25 ring-2 ring-[#C9902F] scale-[1.03]'
                    : 'bg-white text-gray-700 hover:bg-teal-50 hover:text-[#0E7480] border border-gray-200 shadow-xs'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </section>

      {/* Results Header */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[#0B252C]">
              {activeCategory === 'All' ? (searchQuery ? `Search Results` : `Featured Highlights & Catalog`) : activeCategory}
            </h3>
            <p className="text-xs font-bold text-[#0E7480]">
              Showing {filteredItems.length} available dishes & beverages
            </p>
          </div>
          {activeCategory === 'All' && !searchQuery && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0E7480]/30 bg-[#EAF2F4] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0E7480] hover:bg-[#D4E8EC] transition cursor-pointer"
            >
              {showAll ? 'Show top highlights' : `View all ${items.length} items`}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </section>

      {/* The Styled Menu Cards */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        {displayItems.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-[#0E7480]/20 bg-white p-12 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-[#0E7480]/40" />
            <h4 className="mt-4 text-xl font-black text-[#0B252C]">No items match "{searchQuery}"</h4>
            <p className="mt-2 text-sm text-stone-500">Try searching for keywords like "tibs", "tilapia", "burger", "coffee", or "pasta".</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="mt-5 rounded-full bg-gradient-to-r from-[#0E7480] to-[#14919B] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#0E7480]/20"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayItems.map((item, index) => {
              const quantity = cart[item.id] ?? 0;
              const isEven = index % 2 === 0;

              return (
                <article
                  key={item.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border-2 border-[#14919B]/15 bg-white p-5 shadow-[0_12px_32px_rgba(7,59,76,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(7,59,76,0.12)] hover:border-[#14919B]"
                >
                  {/* Pod Header: Title & Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-[#EAF2F4] px-3 py-1 text-[9px] font-black uppercase tracking-[.18em] text-[#0A5C67]">
                        {item.category}
                      </span>
                      {item.amharicName && (
                        <span className="rounded-full bg-[#FDF6E2] px-2.5 py-0.5 text-[11px] font-bold text-[#A6751C]">
                          {item.amharicName}
                        </span>
                      )}
                    </div>

                    {/* Staggered Alternating Layout matching the poster */}
                    <div className={`mt-4 flex items-center gap-4 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                      {/* Circular Food Plate Image with Floating Shadow */}
                      <div className="relative shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-32 w-32 rounded-full object-cover shadow-[0_14px_28px_rgba(0,0,0,0.18)] ring-4 ring-[#F4F7F8] transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            // Never replace an unrelated dish with the same salad photo.
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/food-placeholder.svg';
                          }}
                        />
                      </div>

                      {/* Title & Scalloped Flower Price Badge */}
                      <div className="flex flex-1 flex-col justify-center">
                        <h4 className="font-black text-lg tracking-tight text-[#0B252C] uppercase leading-tight line-clamp-2">
                          {item.name}
                        </h4>

                        <div className="mt-3 flex items-center gap-2">
                          <FlowerPriceBadge price={item.price} />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-xs leading-relaxed text-gray-600 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* ORDER NOW Action Bar */}
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    {quantity === 0 ? (
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#0E7480] to-[#14919B] py-3 text-xs font-black uppercase tracking-[.16em] text-white shadow-lg shadow-[#0E7480]/20 transition hover:brightness-110 active:scale-95 cursor-pointer"
                      >
                        ORDER NOW
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-full border-2 border-[#0E7480] bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF2F4] text-[#0A5C67] transition hover:bg-[#D4E8EC] active:scale-90"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center text-xs font-black text-[#0A5C67]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0E7480] text-white transition hover:bg-[#0A5C67] active:scale-90"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <Link
                          href="/guest/order"
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          In Bag ({quantity})
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Show More Button if limited */}
        {!showAll && activeCategory === 'All' && !searchQuery && displayItems.length < filteredItems.length && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0E7480] to-[#14919B] px-8 py-4 text-xs font-black uppercase tracking-[.18em] text-white shadow-xl shadow-[#0E7480]/20 transition hover:brightness-110 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Load All Menu Items
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* Floating Bottom Cart Bar when items are selected */}
      {totalItems > 0 && (
        <aside className="fixed bottom-6 left-1/2 z-50 w-[92%] max-w-2xl -translate-x-1/2">
          <div className="flex items-center justify-between rounded-full bg-[#0B252C] p-3 pl-6 text-white shadow-2xl ring-2 ring-[#C9902F]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#F8D77A]">Order Summary</p>
              <p className="text-base font-black">
                {totalItems} item{totalItems > 1 ? 's' : ''} · <span className="text-[#F8D77A]">{totalAmount.toLocaleString()} ETB</span>
              </p>
            </div>
            <Link
              href="/guest/order"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#C9902F] to-[#E5B558] px-6 py-3 text-xs font-black uppercase tracking-[.14em] text-[#0B252C] shadow-lg transition hover:scale-105 active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              Checkout Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      )}

      {/* Footer Contact bar */}
      <footer className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#0B252C] via-[#0E353F] to-[#041216] p-6 text-white sm:flex-row sm:px-8 border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-[#F8D77A]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-200/70">Room Delivery & Table Reservation</p>
              <p className="font-black text-lg text-white">+251 994 781 422</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C9902F]">Tule Resort Lake Hawassa</p>
            <p className="text-sm font-bold text-teal-100">Lakeside Terrace & Resort Dining</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
