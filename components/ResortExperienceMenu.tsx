'use client';

import Link from 'next/link';
import { ArrowLeft, BedDouble, CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Heart, Hotel, Sparkles, Users, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';

export type ExperienceItem = {
  id: string;
  name: string;
  amharicName: string;
  category: 'ROOMS' | 'WELLNESS' | 'LEISURE' | 'EVENTS' | 'DINING';
  description: string;
  price: number;
  unit: string;
  imageUrl: string;
  accent: string;
  features: string[];
  href: string;
  actionLabel: string;
};

const categoryMeta = {
  ROOMS: { label: 'Rooms', icon: Hotel, subtitle: 'Comfortable stays with resort hospitality.' },
  WELLNESS: { label: 'Wellness & Fitness', icon: Dumbbell, subtitle: 'Relax, recharge and stay active.' },
  LEISURE: { label: 'Pool & Leisure', icon: Waves, subtitle: 'Fun, fresh air and time to unwind.' },
  EVENTS: { label: 'Events & Business', icon: Users, subtitle: 'Spaces for meetings, celebrations and gatherings.' },
  DINING: { label: 'Dining', icon: Sparkles, subtitle: 'Food, coffee and memorable resort dining.' },
} as const;

function ExperienceCard({ item, liked, onLike }: { item: ExperienceItem; liked: boolean; onLike: () => void }) {
  return (
    <article className="snap-center shrink-0 w-[min(86vw,420px)] md:w-[420px] h-[72vh] min-h-[560px] max-h-[780px] overflow-hidden rounded-[2rem] relative bg-[#15130F] shadow-[0_28px_70px_rgba(0,0,0,.42)] border border-white/10">
      <img src={item.imageUrl} alt={`${item.name} at Tule Resort`} className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_0%,rgba(0,0,0,.14)_30%,rgba(0,0,0,.72)_68%,rgba(0,0,0,.96)_100%)]" />
      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
        <span className="rounded-full border border-white/15 bg-black/45 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-white backdrop-blur-md">{item.category}</span>
        <button type="button" onClick={onLike} className={`h-10 w-10 rounded-full border border-white/15 backdrop-blur-md flex items-center justify-center ${liked ? 'bg-white text-rose-500' : 'bg-black/40 text-white'}`} aria-label={`Favorite ${item.name}`}><Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} /></button>
      </div>
      <div className="absolute left-5 top-20 rounded-2xl bg-white/95 px-4 py-3 shadow-xl">
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-stone-500">Starting price</p>
        <p className="text-2xl leading-none font-black text-stone-950">{item.price.toLocaleString()} <span className="text-xs align-middle">ETB</span></p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-stone-500">{item.unit}</p>
      </div>
      <div className="absolute bottom-5 left-5 right-5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[.22em]" style={{ color: item.accent }}>{item.amharicName}</p>
        <h2 className="text-4xl md:text-5xl font-black uppercase leading-[.92] tracking-[-.05em] text-white">{item.name}</h2>
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/40 p-4 backdrop-blur-lg">
          <p className="text-sm leading-relaxed text-white/85 line-clamp-3">{item.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">{item.features.slice(0, 4).map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/75">{feature}</span>)}</div>
          <Link href={item.href} className="mt-4 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-stone-950 transition hover:scale-[1.02] active:scale-[.98]" style={{ backgroundColor: item.accent }}>{item.actionLabel}<CalendarDays className="h-4 w-4" /></Link>
        </div>
      </div>
    </article>
  );
}

export default function ResortExperienceMenu({ items }: { items: ExperienceItem[] }) {
  const categories = Object.keys(categoryMeta) as ExperienceItem['category'][];
  const [category, setCategory] = useState<ExperienceItem['category']>('ROOMS');
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const filtered = useMemo(() => items.filter((item) => item.category === category), [items, category]);
  const meta = categoryMeta[category];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0C0B09] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0C0B09]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white"><ArrowLeft className="h-4 w-4" />Guest services</Link>
          <Link href="/guest" className="hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-9 w-12 rounded-lg object-cover" /><span className="text-xs font-black uppercase tracking-[.16em]">Tule Resort • Hawassa</span></Link>
          <Link href="/guest/rooms" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[.12em] text-white/70 hover:bg-white/10">Room details</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
        <section className="mb-7 md:mb-10">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[.28em] text-white/45"><Sparkles className="h-4 w-4" />Tule Resort • Guest Menu</div>
              <div className="mt-3 flex items-end gap-4"><h1 className="text-5xl md:text-7xl font-black uppercase tracking-[-.06em] leading-[.86]">RESORT<br /><span className="text-[#F2B84B]">MENU</span></h1><div className="mb-1 hidden sm:block h-2 w-24 rounded-full bg-[#F2B84B]" /></div>
              <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-white/60">Rooms, pool, gym, spa, events and other resort experiences presented like the visual food menu — photo, Amharic name, description, features and price.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{categories.map((id) => { const item = categoryMeta[id]; return <button key={id} type="button" onClick={() => setCategory(id)} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-[.11em] transition ${category === id ? 'text-stone-950 shadow-lg' : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`} style={category === id ? { backgroundColor: '#F2B84B' } : undefined}>{item.label}</button>; })}</div>
          </div>
        </section>

        <section className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><Icon className="h-5 w-5 text-[#F2B84B]" /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-white/35">{meta.label}</p><p className="text-sm text-white/55">{meta.subtitle}</p></div><span className="ml-auto text-xs text-white/30">{filtered.length} options</span></section>

        <section className="relative">
          <div className="pointer-events-none absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 md:block"><button type="button" onClick={() => { const index = categories.indexOf(category); setCategory(categories[(index - 1 + categories.length) % categories.length]); }} className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md" aria-label="Previous category"><ChevronLeft className="h-5 w-5" /></button></div>
          <div className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 md:block"><button type="button" onClick={() => { const index = categories.indexOf(category); setCategory(categories[(index + 1) % categories.length]); }} className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md" aria-label="Next category"><ChevronRight className="h-5 w-5" /></button></div>
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-5 scrollbar-none px-1 md:px-3">{filtered.map((item) => <ExperienceCard key={item.id} item={item} liked={Boolean(liked[item.id])} onLike={() => setLiked((current) => ({ ...current, [item.id]: !current[item.id] }))} />)}</div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.7rem] border border-white/10 bg-white/[.04] p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Visual experience</p><p className="mt-2 text-base font-bold">The same style as the food menu.</p><p className="mt-1 text-xs leading-relaxed text-white/50">Large photography, layered pricing, Amharic names, descriptions and quick actions.</p></div>
          <div className="rounded-[1.7rem] border border-white/10 bg-white/[.04] p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Pricing</p><p className="mt-2 text-base font-bold">Starting prices are shown clearly.</p><p className="mt-1 text-xs leading-relaxed text-white/50">These are draft Tule Resort prices until you connect your final approved price list.</p></div>
          <Link href="/guest/my-activity" className="rounded-[1.7rem] border border-white/10 bg-white/[.04] p-5 hover:bg-white/[.07] transition"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Guest activity</p><p className="mt-2 text-base font-bold">Bookings & requests</p><p className="mt-1 text-xs leading-relaxed text-white/50">Keep the guest journey connected to the existing activity area.</p><p className="mt-3 text-xs font-black uppercase tracking-[.12em] text-[#F2B84B]">Open activity →</p></Link>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/25"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 md:px-6"><div className="flex items-center gap-3"><img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-12 w-16 rounded-lg object-cover" /><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#F2C866]">Tule Resort</p><p className="text-[8px] uppercase tracking-[.24em] text-white/35">Hawassa • Ethiopia</p></div></div><p className="text-[10px] uppercase tracking-[.18em] text-white/35">Relax. Enjoy. Remember.</p></div></footer>
    </div>
  );
}
