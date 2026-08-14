'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Minus, Plus, ShoppingBag, Utensils } from 'lucide-react';
import Link from 'next/link';
import { menuItems as fallbackMenuItems, MenuItem } from '@/data/menu-items';
import supabase from '@/lib/supabaseClient';

const MENU_PAGES = [
  { id: 'main-course', label: 'Main Course', shortLabel: 'Mains', categories: ['Beef & Lamb', 'Poultry & Fish', 'Vegetarian & Vegan', 'Modern & Intercontinental', 'Main Course'], eyebrow: 'SIGNATURE KITCHEN', title: 'MAIN COURSE', subtitle: 'Authentic Ethiopian flavors with a Tule Resort finish.', accent: '#F2B84B' },
  { id: 'appetizers', label: 'Appetizers', shortLabel: 'Starters', categories: ['Sides & Appetizers', 'Starters', 'Appetizers'], eyebrow: 'START HERE', title: 'APPETIZERS', subtitle: 'Fresh, colorful plates made for sharing before the main event.', accent: '#E56B4D' },
  { id: 'breakfast', label: 'Breakfast', shortLabel: 'Morning', categories: ['Breakfast'], eyebrow: 'GOOD MORNING', title: 'BREAKFAST', subtitle: 'Slow mornings, Ethiopian coffee and freshly prepared favorites.', accent: '#7DBA62' },
  { id: 'beverages', label: 'Beverages', shortLabel: 'Drinks', categories: ['Beverages', 'Coffee'], eyebrow: 'POUR & REFRESH', title: 'BEVERAGES', subtitle: 'Fresh juices, hot drinks and refreshing favorites all day long.', accent: '#5FA7C9' },
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
    imageUrl: item.image_url ?? '/tule-resort-mark.svg',
  } as MenuItem;
}

function getItemsForPage(items: MenuItem[], pageId: string) {
  const page = MENU_PAGES.find((item) => item.id === pageId) ?? MENU_PAGES[0];
  return items.filter((item) => page.categories.includes(item.category as never));
}

function FoodCard({ item, quantity, liked, accent, onAdd, onRemove, onLike }: { item: MenuItem; quantity: number; liked: boolean; accent: string; onAdd: () => void; onRemove: () => void; onLike: () => void }) {
  return (
    <article className="snap-center shrink-0 w-[min(86vw,420px)] md:w-[420px] h-[72vh] min-h-[540px] max-h-[760px] overflow-hidden rounded-[2rem] relative bg-[#15130F] shadow-[0_28px_70px_rgba(0,0,0,0.38)] border border-white/10">
      <img src={item.imageUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_0%,rgba(0,0,0,.12)_35%,rgba(0,0,0,.72)_72%,rgba(0,0,0,.94)_100%)]" />
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
        <div className="rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-white backdrop-blur-md border border-white/10">{item.category}</div>
        <button type="button" onClick={onLike} className={`h-10 w-10 rounded-full border border-white/15 backdrop-blur-md flex items-center justify-center transition ${liked ? 'bg-white text-rose-500' : 'bg-black/35 text-white'}`} aria-label={`Favorite ${item.name}`}><Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} /></button>
      </div>
      <div className="absolute top-20 left-5 rounded-2xl bg-white/95 px-4 py-3 shadow-xl"><p className="text-[9px] font-black uppercase tracking-[.18em] text-stone-500">Price</p><p className="text-2xl leading-none font-black text-stone-950">{item.price.toLocaleString()} <span className="text-xs align-middle">ETB</span></p></div>
      <div className="absolute left-5 right-5 bottom-5">
        <div className="mb-4 max-w-[92%]"><p className="mb-1 text-[11px] font-bold uppercase tracking-[.24em]" style={{ color: accent }}>{item.amharicName || 'የምግብ ስም'}</p><h2 className="text-4xl md:text-5xl font-black uppercase leading-[.95] tracking-[-.045em] text-white">{item.name}</h2></div>
        <div className="rounded-[1.4rem] border border-white/10 bg-black/35 backdrop-blur-lg p-4">
          <p className="text-sm md:text-[15px] leading-relaxed text-white/85 line-clamp-3">{item.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 p-1">
              <button type="button" onClick={onRemove} disabled={quantity === 0} className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center disabled:opacity-30"><Minus className="h-4 w-4" /></button>
              <span className="min-w-6 text-center text-sm font-black text-white">{quantity}</span>
              <button type="button" onClick={onAdd} className="h-9 w-9 rounded-full bg-white text-stone-950 flex items-center justify-center"><Plus className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={onAdd} className="flex-1 rounded-full px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-stone-950 transition hover:scale-[1.02] active:scale-[.98]" style={{ backgroundColor: accent }}>Add to order</button>
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
    <div className="min-h-screen overflow-x-hidden bg-[#0C0B09] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0C0B09]/90 backdrop-blur-xl"><div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/75 hover:text-white transition"><ArrowLeft className="h-4 w-4" />Back to Guest Services</Link>
        <Link href="/guest" className="hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-9 w-12 rounded-lg object-cover" /><span className="text-xs font-black uppercase tracking-[.16em]">Tule Resort • {serviceName}</span></Link>
        <div className="flex items-center gap-2"><div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-right"><p className="text-[8px] font-black uppercase tracking-[.18em] text-white/45">Order total</p><p className="text-sm font-black">{totalPrice.toLocaleString()} ETB</p></div><Link href="/guest/order" className="relative h-11 w-11 rounded-full bg-white text-stone-950 flex items-center justify-center shadow-lg" aria-label="Open order"><ShoppingBag className="h-5 w-5" />{totalItems > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-[#E56B4D] text-[10px] font-black text-white flex items-center justify-center px-1">{totalItems}</span>}</Link></div>
      </div></header>
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
        <section className="mb-7 md:mb-10"><div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6"><div className="max-w-3xl"><div className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[.28em] text-white/45"><Utensils className="h-4 w-4" />{page.eyebrow}</div><div className="mt-3 flex items-end gap-4"><h1 className="text-5xl md:text-7xl font-black uppercase tracking-[-.06em] leading-[.86]">{page.title}</h1><div className="mb-1 hidden sm:block h-2 w-24 rounded-full" style={{ backgroundColor: page.accent }} /></div><p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-white/60">{page.subtitle}</p></div><div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{MENU_PAGES.map((item) => <button key={item.id} type="button" onClick={() => setPageId(item.id)} className={`shrink-0 rounded-full px-4 md:px-5 py-2.5 text-xs font-black uppercase tracking-[.12em] transition ${page.id === item.id ? 'text-stone-950 shadow-lg' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'}`} style={page.id === item.id ? { backgroundColor: item.accent } : undefined}><span className="sm:hidden">{item.shortLabel}</span><span className="hidden sm:inline">{item.label}</span></button>)}</div></div></section>
        <section className="relative">{items.length === 0 ? <div className="rounded-[2rem] border border-white/10 bg-white/[.04] p-10 text-center"><p className="text-lg font-black">No items published in this category yet.</p><p className="mt-2 text-sm text-white/40">The manager can add one from the Manager CMS.</p><Link href="/staff/dashboard/menu" className="mt-5 inline-flex rounded-full bg-[#F2B84B] px-5 py-3 text-xs font-black uppercase tracking-wider text-stone-950">Open manager CMS</Link></div> : <><div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden md:block"><button type="button" onClick={() => movePage(-1)} className="pointer-events-auto h-12 w-12 rounded-full border border-white/10 bg-black/45 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60" aria-label="Previous menu page"><ChevronLeft className="h-5 w-5" /></button></div><div className="pointer-events-none absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden md:block"><button type="button" onClick={() => movePage(1)} className="pointer-events-auto h-12 w-12 rounded-full border border-white/10 bg-black/45 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60" aria-label="Next menu page"><ChevronRight className="h-5 w-5" /></button></div><div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-5 scrollbar-none px-1 md:px-3">{items.map((item) => <FoodCard key={item.id} item={item} quantity={cart[item.id] ?? 0} liked={Boolean(liked[item.id])} accent={page.accent} onAdd={() => addToCart(item.id)} onRemove={() => removeFromCart(item.id)} onLike={() => setLiked((current) => ({ ...current, [item.id]: !current[item.id] }))} />)}</div></>}</section>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-[1.7rem] border border-white/10 bg-white/[.04] p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Swipe to explore</p><p className="mt-2 text-base font-bold">Every dish is a visual menu page.</p><p className="mt-1 text-xs leading-relaxed text-white/50">Swipe left and right on mobile or drag the cards horizontally on desktop.</p></div><div className="rounded-[1.7rem] border border-white/10 bg-white/[.04] p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Live CMS</p><p className="mt-2 text-base font-bold">Published items come from Supabase.</p><p className="mt-1 text-xs leading-relaxed text-white/50">When the manager publishes a food item, the guest menu loads the database version automatically.</p></div><Link href="/guest/order" className="rounded-[1.7rem] border border-white/10 bg-white/[.04] p-5 hover:bg-white/[.07] transition"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Current basket</p><div className="mt-2 flex items-end justify-between gap-4"><div><p className="text-2xl font-black">{totalItems}</p><p className="text-xs text-white/45">items selected</p></div><p className="text-lg font-black" style={{ color: page.accent }}>{totalPrice.toLocaleString()} ETB</p></div><p className="mt-3 text-xs font-black uppercase tracking-[.12em] text-white/60">Review order →</p></Link></section>
      </main>
      <footer className="border-t border-white/10 bg-black/25"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 md:px-6"><div className="flex items-center gap-3"><img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-12 w-16 rounded-lg object-cover" /><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#F2C866]">Tule Resort</p><p className="text-[8px] uppercase tracking-[.24em] text-white/35">Hawassa</p></div></div><p className="text-[10px] uppercase tracking-[.18em] text-white/35">Relax. Enjoy. Remember.</p></div></footer>
    </div>
  );
}
