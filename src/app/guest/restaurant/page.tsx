import Link from 'next/link';
import { ArrowLeft, Coffee, MapPin, UtensilsCrossed } from 'lucide-react';
import RestaurantMenuClient from '@/components/RestaurantMenuClient';
import { getMenuItems } from '@/lib/menu';

export default async function TuleRestaurantPage() {
  const items = await getMenuItems();

  return (
    <div className="min-h-screen bg-[#F8FBFC] text-[#073B4C]">
      <header className="relative overflow-hidden bg-[#073B4C] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,162,39,.24),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(11,79,108,.9),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Guest services</Link>
          <div className="grid gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#E2C35A]"><UtensilsCrossed className="h-4 w-4" /> Tule Resort · Hawassa</p>
              <h1 className="mt-5 text-6xl font-black tracking-[-.07em] md:text-8xl">TULE<br /><span className="text-[#C9A227]">RESTAURANT.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/65 md:text-lg">Modern dining with Ethiopian soul, international favorites and a lakeside atmosphere made for memorable meals.</p>
              <div className="mt-7 flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><MapPin className="h-4 w-4 text-[#C9A227]" /> Lakeside dining</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><Coffee className="h-4 w-4 text-[#C9A227]" /> Ethiopian coffee</span></div>
              <div className="mt-7 flex flex-wrap gap-3"><a href="#menu" className="rounded-full bg-[#C9A227] px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-[#073B4C]">View live menu</a><Link href="/guest/order" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-white">Order now</Link></div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-2xl"><div className="flex h-[360px] items-end rounded-[1.5rem] bg-[linear-gradient(145deg,#E9D9B8,#B8D6D9_48%,#0B4F6C)] p-7"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#073B4C]/70">Live kitchen menu</p><p className="mt-2 max-w-sm text-2xl font-black tracking-[-.03em] text-[#073B4C]">{items.length} menu items available for ordering.</p></div></div></div>
          </div>
        </div>
      </header>

      <RestaurantMenuClient items={items} />

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6"><div className="rounded-[2rem] bg-[#0B4F6C] p-8 text-white md:p-10"><h2 className="text-3xl font-black tracking-[-.04em]">Dining your way at Tule.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">Choose a dish, add it to your order bag, and send the completed order through the guest ordering flow.</p><Link href="/guest/order" className="mt-6 inline-flex rounded-full bg-[#C9A227] px-6 py-4 text-xs font-black uppercase tracking-[.13em] text-[#073B4C]">Review your order</Link></div></section>
    </div>
  );
}
