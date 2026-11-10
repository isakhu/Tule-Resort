'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Minus, Plus, ShoppingBag, Utensils } from 'lucide-react';
import Link from 'next/link';
import { menuItems as fallbackMenuItems, MenuItem } from '@/data/menu-items';
import supabase from '@/lib/supabaseClient';

const MENU_PAGES = [
  { id: 'main-course', label: 'Main Course', shortLabel: 'Mains', categories: ['Beef & Lamb', 'Poultry & Fish', 'Vegetarian & Vegan', 'Modern & Intercontinental', 'Main Course'], eyebrow: 'SIGNATURE KITCHEN', title: 'MAIN COURSE', subtitle: 'Authentic Ethiopian flavors with a refined Tule Resort finish.', accent: '#C5A46D' },
  { id: 'appetizers', label: 'Appetizers', shortLabel: 'Starters', categories: ['Sides & Appetizers', 'Starters', 'Appetizers'], eyebrow: 'START HERE', title: 'APPETIZERS', subtitle: 'Fresh, colorful plates made for sharing before the main event.', accent: '#D4B87D' },
  { id: 'breakfast', label: 'Breakfast', shortLabel: 'Morning', categories: ['Breakfast'], eyebrow: 'GOOD MORNING', title: 'BREAKFAST', subtitle: 'Slow mornings, Ethiopian single-origin coffee and freshly prepared favorites.', accent: '#8A9B83' },
  { id: 'beverages', label: 'Beverages', shortLabel: 'Drinks', categories: ['Beverages', 'Coffee'], eyebrow: 'POUR & REFRESH', title: 'BEVERAGES', subtitle: 'Fresh tropical juices, artisan coffees and refreshing lakeside mocktails.', accent: '#C5A46D' },
] as const;

type CartMap = Record<string, number>;
const CART_KEY = 'tule-resort-cart';
const LEGACY_CART_KEY = 'haile-resort-cart';

type DbMenuItem = {
  id: string;
  name: string;
  amharic_name: string | null;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
};

function mapDbItem(item: DbMenuItem): MenuItem {
  return {
    id: item.id,
    name: item.name,
    amharicName: item.amharic_name ?? '',
    description: item.description ?? '',
    category: item.category ?? 'Other',
    price: Number(item.price ?? 0),
    imageUrl: item.image_url ?? '/tule-resort-logo.png',
  } as MenuItem;
}

function getItemsForPage(items: MenuItem[], pageId: string) {
  const page = MENU_PAGES.find((item) => item.id === pageId) ?? MENU_PAGES[0];
  return items.filter((item) => page.categories.includes(item.category as never));
}

function FoodCard({ item, quantity, liked, accent, onAdd, onRemove, onLike }: { item: MenuItem; quantity: number; liked: boolean; accent: string; onAdd: () => void; onRemove: () => void; onLike: () => void }) {
  return (
    <article className="snap-center shrink-0 w-[min(86vw,420px)] md:w-[420px] h-[72vh] min-h-[540px] max-h-[760px] overflow-hidden rounded-[2.2rem] relative bg-[#163D32] shadow-[0_28px_70px_rgba(22,61,50,0.25)] border border-[#C5A46D]/20">
      <img src={item.imageUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,61,50,.08)_0%,rgba(22,61,50,.2)_35%,rgba(22,61,50,.78)_72%,rgba(22,61,50,.96)_100%)]" />
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
        <div className="rounded-full bg-[#163D32]/85 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-[#F5F0E6] backdrop-blur-md border border-[#C5A46D]/30">{item.category}</div>
        <button type="button" onClick={onLike} className={`h-10 w-10 rounded-full border border-white/15 backdrop-blur-md flex items-center justify-center transition ${liked ? 'bg-white text-rose-500' : 'bg-[#163D32]/60 text-white'}`} aria-label={`Favorite ${item.name}`}><Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} /></button>
      </div>
      <div className="absolute top-20 left-5 rounded-2xl bg-white/95 px-4 py-3 shadow-xl border border-[#163D32]/10"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8A9B83]">Price</p><p className="font-display text-2xl leading-none font-bold text-[#163D32]">{item.price.toLocaleString()} <span className="text-xs align-middle font-sans text-[#C5A46D]">ETB</span></p></div>
      <div className="absolute left-5 right-5 bottom-5">
        <div className="mb-4 max-w-[92%]"><p className="mb-1 text-[11px] font-bold uppercase tracking-[.24em] text-[#C5A46D]">{item.amharicName || 'የምግብ ስም'}</p><h2 className="font-display text-4xl md:text-5xl font-medium uppercase leading-[.95] tracking-tight text-[#F5F0E6]">{item.name}</h2></div>
        <div className="rounded-[1.4rem] border border-white/15 bg-[#0F2D24]/85 backdrop-blur-lg p-4">
          <p className="text-sm leading-relaxed text-[#F5F0E6]/85 line-clamp-3">{item.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1">
              <button type="button" onClick={onRemove} disabled={quantity === 0} className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center disabled:opacity-30"><Minus className="h-4 w-4" /></button>
              <span className="min-w-6 text-center text-sm font-black text-white">{quantity}</span>
              <button type="button" onClick={onAdd} className="h-9 w-9 rounded-full bg-white text-[#163D32] flex items-center justify-center"><Plus className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={onAdd} className="flex-1 rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-[#163D32] transition duration-200">Add to order</button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function VisualResortMenu({ serviceName }: { serviceName: string }) {
  const [pageId, setPageId] = useState<(typeof MENU_PAGES)[number]['id']>('main-course');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenuItems);
  const [cart, setCart] = useState<CartMap>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    async function loadPublishedMenu() {
      const { data, error } = await supabase.from('menu_items').select('id,name,amharic_name,description,category,price,image_url').order('created_at', { ascending: true });
      if (!error && data && data.length > 0 && active) setMenuItems((data as DbMenuItem[]).map(mapDbItem));
    }
    void loadPublishedMenu();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_KEY) ?? window.localStorage.getItem(LEGACY_CART_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch { setCart({}); }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const page = MENU_PAGES.find((item) => item.id === pageId) ?? MENU_PAGES[0];
  const items = useMemo(() => getItemsForPage(menuItems, page.id), [menuItems, page.id]);
  const totalItems = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const totalPrice = useMemo(() => menuItems.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0), [menuItems, cart]);
  const addToCart = (id: string) => setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  const removeFromCart = (id: string) => setCart((current) => { const next = { ...current }; const quantity = next[id] ?? 0; if (quantity <= 1) delete next[id]; else next[id] = quantity - 1; return next; });
  const movePage = (direction: 1 | -1) => { const index = MENU_PAGES.findIndex((item) => item.id === pageId); const nextIndex = (index + direction + MENU_PAGES.length) % MENU_PAGES.length; setPageId(MENU_PAGES[nextIndex].id); };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#163D32] text-[#F5F0E6]">
      <header className="sticky top-0 z-40 border-b border-[#C5A46D]/20 bg-[#163D32]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/75 hover:text-[#C5A46D] transition">
            <ArrowLeft className="h-4 w-4" /> Back to Guest Services
          </Link>
          <Link href="/guest" className="hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tule-resort-logo.png" alt="Tule Resort logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-xs font-black uppercase tracking-[.16em] text-[#F5F0E6]">Tule Resort • {serviceName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-right">
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#C5A46D]">Order total</p>
              <p className="font-display text-sm font-bold text-[#F5F0E6]">{totalPrice.toLocaleString()} ETB</p>
            </div>
            <Link href="/guest/order" className="relative h-11 w-11 rounded-full bg-[#C5A46D] text-[#163D32] flex items-center justify-center shadow-lg transition hover:scale-105" aria-label="Open order">
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-[#163D32] text-[10px] font-black text-[#F5F0E6] border border-[#C5A46D] flex items-center justify-center px-1">{totalItems}</span>}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
        <section className="mb-7 md:mb-10">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[.28em] text-[#C5A46D]">
                <Utensils className="h-4 w-4" /> {page.eyebrow}
              </div>
              <div className="mt-3 flex items-end gap-4">
                <h1 className="font-display text-5xl md:text-7xl font-light tracking-tight leading-[.86] text-[#F5F0E6]">
                  {page.title}
                </h1>
                <div className="mb-1 hidden sm:block h-1.5 w-24 rounded-full bg-[#C5A46D]" />
              </div>
              <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-[#F5F0E6]/80 font-normal">
                {page.subtitle}
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {MENU_PAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPageId(item.id)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[.12em] transition cursor-pointer ${
                    page.id === item.id
                      ? 'bg-[#C5A46D] text-[#163D32] shadow-lg font-black'
                      : 'bg-white/5 text-[#F5F0E6]/70 border border-white/10 hover:border-[#C5A46D]/60 hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="relative">
          {items.length === 0 ? (
            <div className="rounded-[2.2rem] border border-white/10 bg-[#0F2D24] p-10 text-center">
              <p className="font-display text-2xl font-medium text-[#F5F0E6]">No items published in this category yet.</p>
              <p className="mt-2 text-sm text-[#8A9B83]">The resort team will publish specialties soon.</p>
              <Link href="/staff/dashboard/menu" className="mt-5 inline-flex rounded-full bg-[#C5A46D] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#163D32]">
                Open manager CMS
              </Link>
            </div>
          ) : (
            <>
              <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden md:block">
                <button type="button" onClick={() => movePage(-1)} className="pointer-events-auto h-12 w-12 rounded-full border border-[#C5A46D]/30 bg-[#163D32]/80 backdrop-blur-md flex items-center justify-center text-[#F5F0E6] hover:bg-[#163D32]" aria-label="Previous menu page">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
              <div className="pointer-events-none absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden md:block">
                <button type="button" onClick={() => movePage(1)} className="pointer-events-auto h-12 w-12 rounded-full border border-[#C5A46D]/30 bg-[#163D32]/80 backdrop-blur-md flex items-center justify-center text-[#F5F0E6] hover:bg-[#163D32]" aria-label="Next menu page">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-5 scrollbar-none px-1 md:px-3">
                {items.map((item) => (
                  <FoodCard key={item.id} item={item} quantity={cart[item.id] ?? 0} liked={Boolean(liked[item.id])} accent={page.accent} onAdd={() => addToCart(item.id)} onRemove={() => removeFromCart(item.id)} onLike={() => setLiked((current) => ({ ...current, [item.id]: !current[item.id] }))} />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.8rem] border border-white/10 bg-[#0F2D24] p-6">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C5A46D]">Swipe to explore</p>
            <p className="mt-2 font-display text-xl font-medium text-[#F5F0E6]">Every dish is a visual showcase.</p>
            <p className="mt-1 text-xs leading-relaxed text-[#F5F0E6]/70">Swipe left and right on mobile or drag the cards horizontally on desktop.</p>
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-[#0F2D24] p-6">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C5A46D]">Fresh Lakeside Dining</p>
            <p className="mt-2 font-display text-xl font-medium text-[#F5F0E6]">Prepared to order.</p>
            <p className="mt-1 text-xs leading-relaxed text-[#F5F0E6]/70">Local ingredients, Sidama organic coffee, and fresh tilapia from Lake Hawassa.</p>
          </div>
          <Link href="/guest/order" className="rounded-[1.8rem] border border-[#C5A46D]/30 bg-[#0F2D24] p-6 hover:border-[#C5A46D] transition group">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C5A46D]">Current basket</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-3xl font-bold text-[#F5F0E6]">{totalItems}</p>
                <p className="text-xs text-[#8A9B83]">items selected</p>
              </div>
              <p className="font-display text-2xl font-bold text-[#C5A46D]">{totalPrice.toLocaleString()} ETB</p>
            </div>
            <p className="mt-3 text-xs font-black uppercase tracking-[.14em] text-[#C5A46D] group-hover:text-white transition">Review order →</p>
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0F2D24]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 md:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tule-resort-logo.png" alt="Tule Resort logo" className="h-10 w-10 rounded-lg object-contain bg-black/20 border border-white/10" />
            <div>
              <p className="font-display text-sm font-semibold text-[#F5F0E6]">Tule Resort</p>
              <p className="text-[8px] uppercase tracking-[.24em] text-[#C5A46D]">Hawassa</p>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[.18em] text-[#F5F0E6]/50">Relax. Enjoy. Remember.</p>
        </div>
      </footer>
    </div>
  );
}
