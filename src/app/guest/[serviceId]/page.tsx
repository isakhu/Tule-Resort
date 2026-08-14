'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Heart, Loader2, Minus, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { MenuItem } from '@/lib/menu';

const SERVICES: Record<string, { name: string; type: 'orderable' | 'bookable' | 'request' }> = {
  cafeteria: { name: 'Cafeteria', type: 'orderable' },
  restaurant: { name: 'Restaurant & Bar', type: 'orderable' },
};

type SupabaseMenuRow = { id?: string | number | null; name?: string | null; amharic_name?: string | null; category?: string | null; price?: number | string | null; image_url?: string | null; description?: string | null; is_active?: boolean | null; is_available?: boolean | null; dietary_tags?: string[] | null };
type CartEntry = { id: string; name: string; price: number; quantity: number; imageUrl: string; amharicName: string };

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80';
const CART_KEY = 'tule-resort-cart';
const LEGACY_CART_KEY = 'haile-resort-cart';

function getCartKey() { return CART_KEY; }

export default function ServicePage() {
  const params = useParams<{ serviceId: string }>();
  const serviceId = params?.serviceId ?? '';
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const service = SERVICES[serviceId];

  useEffect(() => {
    let mounted = true;
    async function loadMenu() {
      try {
        setLoading(true); setError('');
        const { data, error: fetchError } = await supabase.from('menu_items').select('*').eq('is_active', true).eq('department', serviceId).order('category', { ascending: true }).order('name', { ascending: true });
        if (!mounted) return;
        if (fetchError) throw fetchError;
        const mapped: MenuItem[] = (data ?? []).map((row: SupabaseMenuRow) => ({ id: String(row.id ?? ''), name: row.name ?? 'Untitled item', amharicName: row.amharic_name ?? '', category: row.category ?? 'General', price: Number(row.price ?? 0), imageUrl: row.image_url ?? FALLBACK_IMAGE, description: row.description ?? '', isAvailable: row.is_available ?? row.is_active ?? true, dietaryTags: Array.isArray(row.dietary_tags) ? row.dietary_tags.filter((tag): tag is string => typeof tag === 'string') : [] }));
        setItems(mapped); setActiveCategory('All');
      } catch { if (!mounted) return; setError('Unable to load the menu. Please try again.'); }
      finally { if (mounted) setLoading(false); }
    }
    if (!serviceId) return;
    void loadMenu();
    return () => { mounted = false; };
  }, [serviceId]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))], [items]);
  const filteredItems = useMemo(() => activeCategory === 'All' ? items : items.filter((item) => item.category === activeCategory), [activeCategory, items]);

  if (!service) return notFound();

  const updateQuantity = (itemId: string, direction: 'inc' | 'dec') => setQuantities((prev) => { const current = prev[itemId] ?? 1; const next = direction === 'inc' ? current + 1 : Math.max(1, current - 1); return { ...prev, [itemId]: next }; });
  const addToOrder = (item: MenuItem) => {
    if (typeof window === 'undefined') return;
    const quantity = quantities[item.id] ?? 1;
    const existing = JSON.parse(localStorage.getItem(getCartKey()) ?? localStorage.getItem(LEGACY_CART_KEY) ?? '[]') as CartEntry[];
    const foundIndex = existing.findIndex((entry) => entry.id === item.id);
    if (foundIndex >= 0) existing[foundIndex].quantity += quantity;
    else existing.push({ id: item.id, name: item.name, price: item.price, quantity, imageUrl: item.imageUrl, amharicName: item.amharicName });
    localStorage.setItem(getCartKey(), JSON.stringify(existing));
  };

  return (
    <div className="min-h-screen bg-[#120f0d] text-[#f7efe3]">
      <header className="relative overflow-hidden border-b border-white/10 bg-[#1d1713]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,154,61,0.22),transparent_46%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link href="/guest" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#f3d9a0] backdrop-blur-sm transition hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Back</Link>
            <Link href="/guest" className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2"><img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-8 w-11 rounded-md object-cover" /><span className="text-[10px] font-black uppercase tracking-[.2em] text-[#f3d9a0]">Tule Resort</span></Link>
            <button className="inline-flex items-center gap-2 rounded-full bg-[#c98d39] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#1a120d] shadow-lg shadow-[#c98d39]/25 transition hover:scale-[1.02]"><ShoppingCart className="h-4 w-4" />Review Order</button>
          </div>
          <div className="pb-4 pt-2"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#d9b16a]">Tule Resort • Hawassa</p><h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{service.name}</h1><p className="mt-3 max-w-2xl text-sm text-[#e8dcc7] sm:text-base">Curated dishes, seasonal flavors, and warm Ethiopian hospitality.</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {!loading && !error && categories.length > 1 && <div className="mb-6 overflow-x-auto pb-2"><div className="flex min-w-max gap-2">{categories.map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${activeCategory === category ? 'border-[#d9b16a] bg-[#d9b16a] text-[#1b130d]' : 'border-white/10 bg-[#1d1713] text-[#e8dcc7] hover:border-[#d9b16a]/60 hover:text-white'}`}>{category}</button>)}</div></div>}
        {loading && <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-white/10 bg-[#171311]"><div className="flex items-center gap-3 text-[#f2d7a1]"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm font-medium">Loading menu...</span></div></div>}
        {!loading && error && <div className="rounded-[28px] border border-[#d9b16a]/30 bg-[#1d1713] p-8 text-center"><p className="text-lg font-semibold text-white">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-full bg-[#d9b16a] px-5 py-2 text-sm font-bold text-[#1b130d]">Try again</button></div>}
        {!loading && !error && filteredItems.length === 0 && <div className="rounded-[28px] border border-white/10 bg-[#171311] p-8 text-center text-[#e8dcc7]">No menu items are currently available.</div>}
        {!loading && !error && filteredItems.length > 0 && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredItems.map((item) => { const quantity = quantities[item.id] ?? 1; return (
          <article key={item.id} className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#171311] shadow-[0_20px_45px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-1 hover:border-[#d9b16a]/60">
            <div className="relative h-60 overflow-hidden"><img src={item.imageUrl || FALLBACK_IMAGE} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }} /><div className="absolute inset-0 bg-gradient-to-t from-[#120f0d]/80 via-transparent to-transparent" /><button type="button" onClick={() => setFavorites((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#120f0d]/45 backdrop-blur-sm text-white transition hover:bg-[#120f0d]/70" aria-label={`Favorite ${item.name}`}><Heart className={`h-4 w-4 ${favorites[item.id] ? 'fill-[#f7b267] text-[#f7b267]' : 'text-white'}`} /></button><div className="absolute left-4 top-4 rounded-full border border-[#f2d7a1]/30 bg-[#1d1713]/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f2d7a1]">{item.category}</div><div className="absolute bottom-4 right-4 rounded-xl bg-[#c98d39] px-3 py-2 text-lg font-black text-[#1a120d] shadow-lg shadow-[#c98d39]/30">{item.price} Br</div></div>
            <div className="space-y-4 p-5"><div><h2 className="text-2xl font-black leading-tight text-white">{item.name}</h2><p className="mt-1 text-base text-[#d9b16a]">{item.amharicName || '—'}</p></div><p className="text-sm leading-6 text-[#d8cfc2]">{item.description}</p><div className="flex items-center justify-between gap-3"><div className="inline-flex items-center rounded-full border border-white/10 bg-[#201a16] p-1"><button type="button" onClick={() => updateQuantity(item.id, 'dec')} className="flex h-8 w-8 items-center justify-center rounded-full text-[#f7efe3] transition hover:bg-white/5"><Minus className="h-4 w-4" /></button><span className="min-w-8 text-center text-sm font-bold text-white">{quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 'inc')} className="flex h-8 w-8 items-center justify-center rounded-full text-[#f7efe3] transition hover:bg-white/5"><Plus className="h-4 w-4" /></button></div><button type="button" onClick={() => addToOrder(item)} className="rounded-full bg-[#f4d29d] px-4 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-[#1a120d] transition hover:bg-[#f8dca8]">Add to order</button></div></div>
          </article>); })}</div>}
      </main>
      <footer className="border-t border-white/10 bg-[#0d0b0a]"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-12 w-16 rounded-lg object-cover" /><p className="text-xs font-black uppercase tracking-[.18em] text-[#f3d9a0]">Tule Resort • Hawassa</p></div><p className="text-[10px] uppercase tracking-[.18em] text-white/35">Relax. Enjoy. Remember.</p></div></footer>
    </div>
  );
}
