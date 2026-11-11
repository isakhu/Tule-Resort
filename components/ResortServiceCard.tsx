'use client';

import { ArrowUpRight, CalendarDays, ChevronRight, Dumbbell, HeartPulse, Hotel, PartyPopper, Sparkles, Utensils, Waves } from 'lucide-react';
import Link from 'next/link';
import type { ResortService } from '@/data/resort-services';

const icons = { orderable: Utensils, bookable: CalendarDays, request: Waves, informational: Sparkles } as const;
const secondaryIcons = [Hotel, Sparkles, Waves, Dumbbell, PartyPopper, HeartPulse];

export default function ResortServiceCard({ service, index = 0 }: { service: ResortService; index?: number }) {
  const Icon = icons[service.type];
  const MiniIcon = secondaryIcons[index % secondaryIcons.length];

  const targetUrl = service.id === 'rooms'
    ? '/guest/rooms'
    : service.id === 'restaurant'
      ? '/guest/restaurant'
      : service.id === 'cafeteria'
        ? '/guest/cafeteria'
        : service.id === 'pool-passes' || service.id === 'tule-aqua'
          ? '/guest/tule-aqua'
          : service.id === 'experiences'
            ? '/guest/services'
            : `/guest/${encodeURIComponent(service.id)}/request`;

  const infoUrl =
    targetUrl.endsWith('/request') ? `/guest/${encodeURIComponent(service.id)}` : targetUrl;

  return (
    <article className="group relative overflow-hidden rounded-[2.2rem] border border-[#163D32]/15 bg-[#163D32] shadow-[0_20px_50px_rgba(22,61,50,0.12)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(22,61,50,0.2)]">
      <Link
        href={targetUrl}
        tabIndex={-1}
        aria-hidden="true"
        className="block relative h-[360px] sm:h-[400px] cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={service.imageUrl}
          alt={`${service.name} at Tule Resort`}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
          loading={index < 2 ? 'eager' : 'lazy'}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(22,61,50,.1)_0%,rgba(22,61,50,.35)_40%,rgba(22,61,50,.92)_100%)]" />
        
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between pointer-events-none">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#163D32]/85 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-[#F5F0E6] backdrop-blur-md shadow-md">
            <Icon className="h-3.5 w-3.5 text-[#C5A46D]" />
            {service.eyebrow}
          </span>
          <span className="h-10 w-10 rounded-full border border-white/15 bg-[#163D32]/70 text-[#C5A46D] backdrop-blur-md flex items-center justify-center shadow-md">
            <MiniIcon className="h-4 w-4" />
          </span>
        </div>

        <div className="absolute bottom-5 left-5 right-5 pointer-events-none">
          <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#F5F0E6] group-hover:text-[#C5A46D] transition-colors">
            {service.name}
          </h2>
          <p className="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-[#F5F0E6]/85 font-normal">
            {service.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {service.features.slice(0, 3).map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-[#C5A46D]/20 bg-[#163D32]/70 px-3 py-1 text-[10px] font-bold text-[#F5F0E6]/90 backdrop-blur-sm"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-3 border-t border-[#C5A46D]/20 bg-[#0F2D24] p-4">
        <Link
          href={targetUrl}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-[#163D32] transition duration-200 active:scale-[.98]"
        >
          Explore {service.name} <ChevronRight className="h-4 w-4" />
        </Link>
        {infoUrl !== targetUrl && (
          <Link
            href={infoUrl}
            className="h-11 w-11 shrink-0 rounded-full border border-white/15 bg-white/5 text-[#F5F0E6] flex items-center justify-center hover:bg-white/15 hover:text-[#C5A46D] transition"
            aria-label={`View overview for ${service.name}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}
