import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Coffee, MapPin, UtensilsCrossed } from 'lucide-react';
import RestaurantMenuClient from '@/components/RestaurantMenuClient';
import { getMenuItems } from '@/lib/menu';

export const metadata: Metadata = {
  title: 'Tule Restaurant & Lakeside Dining',
  description:
    'Explore modern Ethiopian cuisine, international specialties, artisan coffee, and live lakeside dining menus at Tule Resort.',
};

export default async function TuleRestaurantPage() {
  const items = await getMenuItems();
  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D]">
      <header className="relative overflow-hidden bg-[#163D32] text-[#F5F0E6] border-b border-[#C5A46D]/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(197,164,109,.18),transparent_35%),radial-gradient(circle_at_10%_90%,rgba(138,155,131,.14),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/80 transition hover:text-[#C5A46D]"><ArrowLeft className="h-4 w-4" /> Guest services</Link>
          <div className="grid gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-4 py-2 text-xs font-black uppercase tracking-[.2em] text-[#C5A46D]"><UtensilsCrossed className="h-4 w-4" /> Tule Resort · Hawassa</p>
              <h1 className="mt-5 font-display text-6xl font-light tracking-tight md:text-8xl leading-none">TULE<br /><span className="italic font-normal text-[#C5A46D]">RESTAURANT.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#F5F0E6]/80 md:text-lg">Modern dining with Ethiopian soul, international favorites and a lakeside atmosphere made for memorable meals.</p>
              <div className="mt-7 flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#F5F0E6]"><MapPin className="h-4 w-4 text-[#C5A46D]" /> Lakeside dining</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#F5F0E6]"><Coffee className="h-4 w-4 text-[#C5A46D]" /> Ethiopian coffee</span></div>
            </div>
            <div className="overflow-hidden rounded-[2.2rem] border border-[#C5A46D]/25 bg-[#0F2D24] p-2 shadow-2xl"><div className="flex h-[360px] items-end rounded-[1.8rem] bg-[linear-gradient(145deg,#163D32,#0F2D24_60%,#26312D)] border border-[#C5A46D]/20 p-7"><div><p className="text-xs font-black uppercase tracking-[.22em] text-[#C5A46D]">Live kitchen menu</p><p className="mt-2 max-w-sm font-display text-2xl font-medium tracking-tight text-[#F5F0E6]">{items.length} menu items available for ordering.</p></div></div></div>
          </div>
        </div>
      </header>
      <RestaurantMenuClient items={items} />
    </div>
  );
}
