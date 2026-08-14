'use client';

import { ArrowUpRight, CalendarDays, ChevronRight, Dumbbell, HeartPulse, Hotel, PartyPopper, Sparkles, Utensils, Waves } from 'lucide-react';
import Link from 'next/link';
import type { ResortService } from '@/data/resort-services';

const icons = { orderable: Utensils, bookable: CalendarDays, request: Waves, informational: Sparkles } as const;
const secondaryIcons = [Hotel, Sparkles, Waves, Dumbbell, PartyPopper, HeartPulse];

export default function ResortServiceCard({ service, index = 0 }: { service: ResortService; index?: number }) {
  const Icon = icons[service.type];
  const MiniIcon = secondaryIcons[index % secondaryIcons.length];

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#15130F] shadow-[0_24px_60px_rgba(0,0,0,.28)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(0,0,0,.38)]">
      <div className="relative h-[360px] sm:h-[390px]">
        <img src={service.imageUrl} alt={`${service.name} at Tule Resort`} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading={index < 2 ? 'eager' : 'lazy'} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.06)_0%,rgba(0,0,0,.15)_38%,rgba(0,0,0,.9)_100%)]" />
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-white backdrop-blur-md"><Icon className="h-3.5 w-3.5" style={{ color: service.accent }} />{service.eyebrow}</span>
          <span className="h-10 w-10 rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md flex items-center justify-center"><MiniIcon className="h-4 w-4" /></span>
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <h2 className="text-3xl sm:text-4xl font-black tracking-[-.045em] text-white">{service.name}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">{service.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">{service.features.slice(0, 3).map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">{feature}</span>)}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 bg-white/[.035] p-4">
        <Link href={`/guest/${service.id}`} className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-stone-950 transition hover:scale-[1.01] active:scale-[.98]" style={{ backgroundColor: service.accent }}>Explore service<ChevronRight className="h-4 w-4" /></Link>
        <a href={service.sourceUrl} target="_blank" rel="noreferrer" className="h-11 w-11 shrink-0 rounded-full border border-white/10 bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 hover:text-white" aria-label={`View Tule Resort information for ${service.name}`}><ArrowUpRight className="h-4 w-4" /></a>
      </div>
    </article>
  );
}
