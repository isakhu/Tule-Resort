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
  ROOMS: { label: 'Suites & Rooms', icon: Hotel, subtitle: 'Lakefront accommodations and tranquil garden retreats.' },
  WELLNESS: { label: 'Wellness & Spa', icon: Dumbbell, subtitle: 'Relax, restore vitality and stay active.' },
  LEISURE: { label: 'Pool & Aquatic', icon: Waves, subtitle: 'Lakeside breezes, 24-hr pool, and sunset waters.' },
  EVENTS: { label: 'Events & Banquets', icon: Users, subtitle: 'Conference halls, celebrations, and lakeside gatherings.' },
  DINING: { label: 'Dining & Lounge', icon: Sparkles, subtitle: 'Artisan Ethiopian coffee, Lake Hawassa fish, and signature culinary creations.' },
} as const;

function ExperienceCard({ item, liked, onLike }: { item: ExperienceItem; liked: boolean; onLike: () => void }) {
  return (
    <article className="snap-center shrink-0 w-[min(86vw,420px)] md:w-[420px] h-[72vh] min-h-[560px] max-h-[780px] overflow-hidden rounded-[2.2rem] relative bg-[#163D32] shadow-[0_28px_70px_rgba(22,61,50,.25)] border border-[#C5A46D]/20">
      <img src={item.imageUrl} alt={`${item.name} at Tule Resort`} className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,61,50,.08)_0%,rgba(22,61,50,.2)_30%,rgba(22,61,50,.78)_68%,rgba(22,61,50,.96)_100%)]" />
      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
        <span className="rounded-full border border-[#C5A46D]/30 bg-[#163D32]/85 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-[#F5F0E6] backdrop-blur-md">{item.category}</span>
        <button type="button" onClick={onLike} className={`h-10 w-10 rounded-full border border-white/15 backdrop-blur-md flex items-center justify-center transition ${liked ? 'bg-white text-rose-500' : 'bg-[#163D32]/60 text-white'}`} aria-label={`Favorite ${item.name}`}><Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} /></button>
      </div>
      <div className="absolute left-5 top-20 rounded-2xl bg-white/95 px-4 py-3 shadow-xl border border-[#163D32]/10">
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8A9B83]">Starting price</p>
        <p className="font-display text-2xl leading-none font-bold text-[#163D32]">{item.price.toLocaleString()} <span className="text-xs align-middle font-sans text-[#C5A46D]">ETB</span></p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#8A9B83]">{item.unit}</p>
      </div>
      <div className="absolute bottom-5 left-5 right-5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[.22em] text-[#C5A46D]">{item.amharicName}</p>
        <h2 className="font-display text-4xl md:text-5xl font-medium uppercase leading-[.92] tracking-tight text-[#F5F0E6]">{item.name}</h2>
        <div className="mt-4 rounded-[1.4rem] border border-white/15 bg-[#0F2D24]/85 p-4 backdrop-blur-lg">
          <p className="text-sm leading-relaxed text-[#F5F0E6]/85 line-clamp-3">{item.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">{item.features.slice(0, 4).map((feature) => <span key={feature} className="rounded-full border border-[#C5A46D]/20 bg-[#163D32]/80 px-3 py-1 text-[10px] font-bold text-[#F5F0E6]/80">{feature}</span>)}</div>
          <Link href={item.href} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-[#163D32] transition hover:scale-[1.02] active:scale-[.98]">{item.actionLabel}<CalendarDays className="h-4 w-4" /></Link>
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
    <div className="min-h-screen overflow-x-hidden bg-[#163D32] text-[#F5F0E6]">
      <header className="sticky top-0 z-40 border-b border-[#C5A46D]/20 bg-[#163D32]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/75 hover:text-[#C5A46D] transition"><ArrowLeft className="h-4 w-4" /> Guest services</Link>
          <Link href="/guest" className="hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><img src="/tule-resort-logo.png" alt="Tule Resort logo" className="h-8 w-8 rounded-lg object-contain" /><span className="text-xs font-black uppercase tracking-[.16em] text-[#F5F0E6]">Tule Resort • Hawassa</span></Link>
          <Link href="/guest/rooms" className="rounded-full border border-[#C5A46D]/30 bg-[#0F2D24] px-4 py-2 text-[10px] font-black uppercase tracking-[.12em] text-[#C5A46D] hover:border-[#C5A46D] transition">Room details</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-10">
        <section className="mb-7 md:mb-10">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[.28em] text-[#C5A46D]"><Sparkles className="h-4 w-4" /> Tule Resort • Guest Menu</div>
              <div className="mt-3 flex items-end gap-4"><h1 className="font-display text-5xl md:text-7xl font-light uppercase tracking-tight leading-[.86] text-[#F5F0E6]">RESORT<br /><span className="italic font-normal text-[#C5A46D]">MENU</span></h1><div className="mb-1 hidden sm:block h-1.5 w-24 rounded-full bg-[#C5A46D]" /></div>
              <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-[#F5F0E6]/80 font-normal">Suites, aquatic leisure, wellness, banquet facilities and resort experiences presented with photos, Amharic titles, detailed features and rates.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{categories.map((id) => { const item = categoryMeta[id]; return <button key={id} type="button" onClick={() => setCategory(id)} className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[.11em] transition cursor-pointer ${category === id ? 'bg-[#C5A46D] text-[#163D32] shadow-lg font-black' : 'border border-white/10 bg-white/5 text-[#F5F0E6]/70 hover:border-[#C5A46D]/60 hover:text-white'}`}>{item.label}</button>; })}</div>
          </div>
        </section>

        <section className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C5A46D]/30 bg-[#0F2D24]"><Icon className="h-5 w-5 text-[#C5A46D]" /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#C5A46D]">{meta.label}</p><p className="text-sm text-[#F5F0E6]/70">{meta.subtitle}</p></div><span className="ml-auto text-xs text-[#8A9B83]">{filtered.length} options</span></section>

        <section className="relative">
          <div className="pointer-events-none absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 md:block"><button type="button" onClick={() => { const index = categories.indexOf(category); setCategory(categories[(index - 1 + categories.length) % categories.length]); }} className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#C5A46D]/30 bg-[#163D32]/80 text-[#F5F0E6] backdrop-blur-md" aria-label="Previous category"><ChevronLeft className="h-5 w-5" /></button></div>
          <div className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 md:block"><button type="button" onClick={() => { const index = categories.indexOf(category); setCategory(categories[(index + 1) % categories.length]); }} className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#C5A46D]/30 bg-[#163D32]/80 text-[#F5F0E6] backdrop-blur-md" aria-label="Next category"><ChevronRight className="h-5 w-5" /></button></div>
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-5 scrollbar-none px-1 md:px-3">{filtered.map((item) => <ExperienceCard key={item.id} item={item} liked={Boolean(liked[item.id])} onLike={() => setLiked((current) => ({ ...current, [item.id]: !current[item.id] }))} />)}</div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.8rem] border border-white/10 bg-[#0F2D24] p-6"><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C5A46D]">Visual experience</p><p className="mt-2 font-display text-xl font-medium text-[#F5F0E6]">Atmospheric showcase.</p><p className="mt-1 text-xs leading-relaxed text-[#F5F0E6]/70">Large photography, clear rates, Amharic designations, and instant booking steps.</p></div>
          <div className="rounded-[1.8rem] border border-white/10 bg-[#0F2D24] p-6"><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C5A46D]">Lakeside Luxury</p><p className="mt-2 font-display text-xl font-medium text-[#F5F0E6]">Direct Concierge Access.</p><p className="mt-1 text-xs leading-relaxed text-[#F5F0E6]/70">All rates include resort pool, high-speed Wi-Fi, and breakfast on the lake terrace.</p></div>
          <Link href="/guest/my-activity" className="rounded-[1.8rem] border border-[#C5A46D]/30 bg-[#0F2D24] p-6 hover:border-[#C5A46D] transition group"><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C5A46D]">Guest activity</p><p className="mt-2 font-display text-xl font-medium text-[#F5F0E6]">Bookings &amp; requests</p><p className="mt-1 text-xs leading-relaxed text-[#F5F0E6]/70">Keep your resort itinerary, room charges, and dining requests in one live space.</p><p className="mt-3 text-xs font-black uppercase tracking-[.12em] text-[#C5A46D] group-hover:text-white transition">Open activity →</p></Link>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0F2D24]"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 md:px-6"><div className="flex items-center gap-3"><img src="/tule-resort-logo.png" alt="Tule Resort logo" className="h-10 w-10 rounded-lg object-contain bg-black/20 border border-white/10" /><div><p className="font-display text-sm font-semibold text-[#F5F0E6]">Tule Resort</p><p className="text-[8px] uppercase tracking-[.24em] text-[#C5A46D]">Hawassa • Ethiopia</p></div></div><p className="text-[10px] uppercase tracking-[.18em] text-[#F5F0E6]/50">Relax. Enjoy. Remember.</p></div></footer>
    </div>
  );
}
