'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Minus, Phone, Plus, Search, ShoppingBag, Sparkles, UtensilsCrossed } from 'lucide-react';
import type { MenuItem } from '@/lib/menu';

function FlowerPriceBadge({ price }: { price: number }) {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center select-none transition-transform hover:scale-105">
      <svg viewBox="0 0 100 100" className="h-full w-full text-[#FF6B00] drop-shadow-[0_4px_10px_rgba(255,107,0,0.35)]" fill="currentColor">
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

      return matchesCategory && matchesSearch;
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
    <main id="menu" className="relative min-h-screen bg-[#FFF9F2] pb-28 pt-8">
      {/* Top Banner & Search */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#FF6B00] via-[#FA812F] to-[#E85D04] p-6 text-white shadow-2xl md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-black/10 blur-2xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-white backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-[#FFE600]" />
                Tule Resort Live Kitchen Menu ({items.length} Items)
              </span>
              <h2 className="mt-3 font-black text-4xl tracking-tight sm:text-5xl md:text-6xl uppercase leading-none">
                FRESH. FLAVORFUL.<br />
                <span className="text-[#FFE600]">ALWAYS DELICIOUS.</span>
              </h2>
              <p className="mt-3 text-sm text-white/85 sm:text-base leading-relaxed">
                Explore our full culinary collection from authentic Ethiopian favorites and sizzling clay-pot tibs to crispy fast-casual check-check bowls, fresh lake fish, woodfired pizzas, and artisan drinks.
              </p>
            </div>

            {/* Quick Live Order Counter Pill */}
            {totalItems > 0 && (
              <Link
                href="/guest/order"
                className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-xs font-black uppercase tracking-[.14em] text-[#FF6B00] shadow-xl transition hover:scale-105 active:scale-95"
              >
                <ShoppingBag className="h-4 w-4 text-[#FF6B00]" />
                Review Order ({totalItems} items · {totalAmount.toLocaleString()} ETB)
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Search Bar inside banner */}
          <div className="relative mt-8">
            <div className="relative flex items-center">
              <Search className="absolute left-5 h-5 w-5 text-[#FF6B00]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all 200 items (e.g. Jollof, Tibs, Noodles, Kitfo, Boba, Pizza, Burger...)"
                className="w-full rounded-full border-2 border-white/30 bg-white py-4 pl-14 pr-6 text-sm font-bold text-[#182326] placeholder:text-[#182326]/40 shadow-lg outline-none transition focus:border-[#FFE600] focus:ring-4 focus:ring-white/20"
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
                className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30 scale-[1.03]'
                    : 'bg-white text-[#182326]/70 border border-[#FF6B00]/15 hover:border-[#FF6B00]/40 hover:text-[#FF6B00]'
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
        <div className="flex items-center justify-between border-b border-[#FF6B00]/15 pb-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[#182326]">
              {activeCategory === 'All' ? (searchQuery ? `Search Results` : `Featured Highlights & Catalog`) : activeCategory}
            </h3>
            <p className="text-xs font-bold text-[#FF6B00]/80">
              Showing {filteredItems.length} available dishes & beverages
            </p>
          </div>
          {activeCategory === 'All' && !searchQuery && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6B00]/30 bg-[#FFF0DB] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#FF6B00] hover:bg-[#FFE3C2] transition"
            >
              {showAll ? 'Show top highlights' : `View all ${items.length} items`}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </section>

      {/* The Styled Menu Cards (Matching User's Reference Poster) */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        {displayItems.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-[#FF6B00]/20 bg-white p-12 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-[#FF6B00]/40" />
            <h4 className="mt-4 text-xl font-black text-[#182326]">No items match "{searchQuery}"</h4>
            <p className="mt-2 text-sm text-stone-500">Try searching for keywords like "rice", "tibs", "burger", "coffee", or "pasta".</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="mt-5 rounded-full bg-[#FF6B00] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white"
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
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border-2 border-[#FFD9A8] bg-[#FFF8EE] p-5 shadow-[0_16px_40px_rgba(255,107,0,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(255,107,0,0.18)] hover:border-[#FF6B00]"
                >
                  {/* Pod Header: Title & Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-[#FFE6C7] px-3 py-1 text-[9px] font-black uppercase tracking-[.18em] text-[#C04800]">
                        {item.category}
                      </span>
                      {item.amharicName && (
                        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-[#E65100]">
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
                          className="h-32 w-32 rounded-full object-cover shadow-[0_14px_28px_rgba(0,0,0,0.22)] ring-4 ring-white transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
                          }}
                        />
                      </div>

                      {/* Title & Scalloped Flower Price Badge */}
                      <div className="flex flex-1 flex-col justify-center">
                        <h4 className="font-black text-xl tracking-tight text-[#C04800] uppercase leading-tight line-clamp-2">
                          {item.name}
                        </h4>

                        <div className="mt-3 flex items-center gap-2">
                          <FlowerPriceBadge price={item.price} />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-xs leading-relaxed text-[#182326]/70 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* ORDER NOW Action Bar */}
                  <div className="mt-5 border-t border-[#FFD9A8]/70 pt-4">
                    {quantity === 0 ? (
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8500] py-3 text-xs font-black uppercase tracking-[.16em] text-white shadow-lg shadow-[#FF6B00]/25 transition hover:from-[#E65100] hover:to-[#FF6B00] active:scale-95 cursor-pointer"
                      >
                        ORDER NOW
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-full border-2 border-[#FF6B00] bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFE6C7] text-[#C04800] transition hover:bg-[#FFD199] active:scale-90"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center text-xs font-black text-[#C04800]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B00] text-white transition hover:bg-[#E65100] active:scale-90"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <Link
                          href="/guest/order"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#2E7D32] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md transition hover:bg-[#1B5E20]"
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
              className="inline-flex items-center gap-2 rounded-full bg-[#FF6B00] px-8 py-4 text-xs font-black uppercase tracking-[.18em] text-white shadow-xl shadow-[#FF6B00]/30 transition hover:bg-[#E65100] hover:scale-105 active:scale-95"
            >
              Load All 200 Menu Items
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* Floating Bottom Cart Bar when items are selected */}
      {totalItems > 0 && (
        <aside className="fixed bottom-6 left-1/2 z-50 w-[92%] max-w-2xl -translate-x-1/2">
          <div className="flex items-center justify-between rounded-full bg-[#182326] p-3 pl-6 text-white shadow-2xl ring-2 ring-[#FF6B00]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF9E40]">Order Summary</p>
              <p className="text-base font-black">
                {totalItems} item{totalItems > 1 ? 's' : ''} · <span className="text-[#FFE600]">{totalAmount.toLocaleString()} ETB</span>
              </p>
            </div>
            <Link
              href="/guest/order"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8500] px-6 py-3 text-xs font-black uppercase tracking-[.14em] text-white shadow-lg transition hover:scale-105 active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              Checkout Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      )}

      {/* Footer Contact bar matching poster style */}
      <footer className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-[#FF6B00] p-6 text-white sm:flex-row sm:px-8">
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-[#FFE600]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Room Delivery & Table Reservation</p>
              <p className="font-black text-lg">+251 911 00 00 00 / +251 922 00 00 00</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Tule Resort Lake Hawassa</p>
            <p className="text-sm font-bold">Lakeside Terrace & Resort Dining</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
