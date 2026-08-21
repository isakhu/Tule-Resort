'use client';

import Link from 'next/link';
import { Check, Minus, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MenuItem } from '@/lib/menu';

const CART_KEY = 'tule-resort-cart';
const CART_ITEMS_KEY = 'tule-resort-cart-items';

type Props = { items: MenuItem[] };

type Cart = Record<string, number>;

export default function RestaurantMenuClient({ items }: Props) {
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<Cart>({});

  const visibleItems = activeCategory === 'All' ? items : items.filter((item) => item.category === activeCategory);
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);

  const persist = (next: Cart) => {
    setCart(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_KEY, JSON.stringify(next));
      window.localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items));
    }
  };

  const changeQuantity = (item: MenuItem, delta: number) => {
    const next = { ...cart };
    const quantity = Math.max(0, (next[item.id] ?? 0) + delta);
    if (quantity === 0) delete next[item.id];
    else next[item.id] = quantity;
    persist(next);
  };

  return (
    <div id="menu" className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]/55">Live restaurant menu</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">100 dishes and drinks.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#073B4C]/60">These items are loaded directly from Tule Resort’s live menu database.</p>
        </div>
        <Link href="/guest/order" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B4F6C] px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-white">
          <ShoppingBag className="h-4 w-4" /> Order bag {totalItems > 0 ? `(${totalItems})` : ''}
        </Link>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-black ${activeCategory === category ? 'bg-[#C9A227] text-[#073B4C]' : 'bg-[#EAF4F7] text-[#073B4C]/70'}`}>
            {category}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((item) => {
          const quantity = cart[item.id] ?? 0;
          return (
            <article key={item.id} className="flex flex-col overflow-hidden rounded-[1.5rem] border border-[#0B4F6C]/10 bg-white shadow-[0_15px_45px_rgba(7,59,76,.07)]">
              <div className="flex h-36 items-end bg-[linear-gradient(145deg,#E9D9B8,#B8D6D9_48%,#0B4F6C)] p-5 text-white">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/70">{item.category}</p>
                  <p className="mt-1 text-2xl font-black leading-none">{item.price.toLocaleString()} <span className="text-xs">ETB</span></p>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#C9A227]">{item.amharicName}</p>
                <h3 className="mt-1 text-lg font-black">{item.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#073B4C]/55">{item.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  {quantity === 0 ? (
                    <button type="button" onClick={() => changeQuantity(item, 1)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0B4F6C] px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-white">
                      <Plus className="h-4 w-4" /> Add to order
                    </button>
                  ) : (
                    <div className="flex flex-1 items-center justify-between rounded-full bg-[#EAF4F7] px-2 py-2">
                      <button type="button" onClick={() => changeQuantity(item, -1)} className="h-9 w-9 rounded-full bg-white text-[#073B4C] shadow-sm"><Minus className="mx-auto h-4 w-4" /></button>
                      <span className="text-sm font-black">{quantity}</span>
                      <button type="button" onClick={() => changeQuantity(item, 1)} className="h-9 w-9 rounded-full bg-[#C9A227] text-[#073B4C]"><Plus className="mx-auto h-4 w-4" /></button>
                    </div>
                  )}
                  {quantity > 0 ? <Check className="h-5 w-5 shrink-0 text-[#2F8F5B]" /> : <UtensilsCrossed className="h-5 w-5 shrink-0 text-[#0B4F6C]/30" />}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {totalItems > 0 ? (
        <div className="sticky bottom-4 z-20 mx-auto mt-8 flex max-w-3xl items-center justify-between gap-4 rounded-full border border-black/5 bg-white px-5 py-3 shadow-2xl">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#073B4C]/45">Current order</p>
            <p className="text-sm font-black">{totalItems} items · {totalPrice.toLocaleString()} ETB</p>
          </div>
          <Link href="/guest/order" className="rounded-full bg-[#C9A227] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#073B4C]">Review order</Link>
        </div>
      ) : null}
    </div>
  );
}
