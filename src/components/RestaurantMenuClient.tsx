'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Minus, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { MenuItem } from '@/lib/menu';

const CATEGORIES = [
  ['Breakfast', 'Ethiopian and continental breakfast favorites.'],
  ['Ethiopian Favorites', 'Tule classics with the flavors of Ethiopia.'],
  ['Main Courses', 'Grilled, hearty and resort-style dishes.'],
  ['Pizza & Pasta', 'Easygoing Italian-inspired favorites.'],
  ['Burgers & Sandwiches', 'Casual choices for lunch and relaxed dining.'],
  ['Desserts & Drinks', 'Sweet finishes, coffee and fresh refreshments.'],
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  Ethiopian: 'Ethiopian Favorites',
  Mains: 'Main Courses',
  Pizza: 'Pizza & Pasta',
  Pasta: 'Pizza & Pasta',
  Desserts: 'Desserts & Drinks',
  Drinks: 'Desserts & Drinks',
  'Fish & Seafood': 'Main Courses',
  Sides: 'Main Courses',
};

export default function RestaurantMenuClient({ items }: { items: MenuItem[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const key = CATEGORY_ALIASES[item.category] ?? item.category;
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }
    return map;
  }, [items]);

  const visibleItems = category
    ? grouped.get(category) ?? []
    : showAll
      ? items
      : items.slice(0, 6);

  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

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

  return (
    <main id="menu" className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]/55">Restaurant menu</p>
          <h2 className="mt-2 text-4xl font-black md:text-5xl">Simple. Clear. Delicious.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#073B4C]/55">
            Six simple sections keep dining easy to browse. The complete menu stays one click away.
          </p>
        </div>
        {totalItems > 0 ? (
          <Link
            href="/guest/order"
            className="inline-flex items-center gap-2 rounded-full bg-[#073B4C] px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-white"
          >
            <ShoppingBag className="h-4 w-4" />
            Review order ({totalItems})
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(([label, description]) => {
          const count = grouped.get(label)?.length ?? 0;
          const active = category === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setCategory(active ? null : label)}
              className={`rounded-3xl border p-5 text-left transition ${
                active
                  ? 'border-[#C9A227] bg-[#F3E9D2]'
                  : 'border-[#0B4F6C]/10 bg-white hover:shadow-lg'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF4F7] text-[#0B4F6C]">
                    <UtensilsCrossed className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-black">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#073B4C]/55">{description}</p>
                </div>
                <span className="rounded-full bg-[#F8FBFC] px-3 py-1 text-[10px] font-black">{count}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#C9A227]">
            {category ?? (showAll ? 'Full menu' : 'Featured')}
          </p>
          <h3 className="mt-2 text-3xl font-black">{category ?? (showAll ? 'All menu items' : 'Guest favorites')}</h3>
        </div>
        <div className="flex gap-2">
          {category ? (
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="rounded-full border border-[#0B4F6C]/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[.12em]"
            >
              Clear category
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-[#C9A227] px-5 py-3 text-[10px] font-black uppercase tracking-[.12em]"
            >
              {showAll ? 'Show featured' : 'View full menu'}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => {
          const quantity = cart[item.id] ?? 0;
          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-[#0B4F6C]/10 bg-white shadow-[0_15px_45px_rgba(7,59,76,.06)]"
            >
              <div className="h-44 bg-[#EAF4F7]">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#0B4F6C]/30">
                    <UtensilsCrossed className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#C9A227]">{item.amharicName}</p>
                    <h4 className="mt-1 font-black">{item.name}</h4>
                  </div>
                  <span className="shrink-0 text-sm font-black text-[#0B4F6C]">{item.price.toLocaleString()} ETB</span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#073B4C]/55">{item.description}</p>

                <div className="mt-5 flex items-center justify-between gap-3">
                  {quantity === 0 ? (
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, 1)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#073B4C] px-4 py-3 text-[10px] font-black uppercase tracking-[.12em] text-white"
                    >
                      Add to order
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#0B4F6C]/10 bg-[#F8FBFC] p-1">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-xs font-black">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#073B4C] text-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {quantity > 0 ? (
                    <Link href="/guest/order" className="text-[10px] font-black uppercase tracking-[.12em] text-[#0B4F6C]">
                      View bag →
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
