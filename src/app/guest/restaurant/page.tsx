import Link from 'next/link';
import { ArrowLeft, Coffee, Fish, GlassWater, MapPin, UtensilsCrossed } from 'lucide-react';

const categories = [
  ['Breakfast', 'Ethiopian, continental and buffet breakfast options.', UtensilsCrossed],
  ['Starters', 'Light plates and shareable Ethiopian and international favorites.', UtensilsCrossed],
  ['Ethiopian', 'Traditional Ethiopian dishes and signature preparations.', UtensilsCrossed],
  ['Main Courses', 'Modern fusion, grilled dishes, pizza, pasta and seafood.', Fish],
  ['Pizza & Pasta', 'Comforting Italian-inspired dishes for resort dining.', UtensilsCrossed],
  ['Burgers & Sandwiches', 'Relaxed favorites for lunch and casual dining.', UtensilsCrossed],
  ['Seafood', 'Fresh-inspired seafood choices for lakeside dining.', Fish],
  ['Desserts', 'Sweet finishes for a relaxed Tule dining experience.', UtensilsCrossed],
  ['Drinks', 'Fresh juices, soft drinks, mocktails and cocktails.', GlassWater],
  ['Coffee', 'Ethiopian coffee ceremony alongside a modern coffee menu.', Coffee],
] as const;

const dishes = [
  ['Traditional Ethiopian Breakfast', 'A warm Ethiopian-style breakfast experience.', 450],
  ['Tule Signature Tibs', 'A signature Ethiopian-inspired main course.', 850],
  ['Lake View Grilled Selection', 'A premium grilled main course for relaxed lakeside dining.', 1100],
  ['Tule Garden Pasta', 'A modern international pasta preparation.', 700],
  ['Lakeside Burger', 'A generous resort-style burger and casual favorite.', 650],
  ['Chef’s Seasonal Special', 'A changing modern fusion dish from the kitchen.', 950],
] as const;

export default function TuleRestaurantPage() {
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
              <p className="mt-6 max-w-xl text-base leading-8 text-white/65 md:text-lg">Modern luxury dining with Ethiopian soul, international favorites and a lakeside atmosphere made for memorable meals.</p>
              <div className="mt-7 flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><MapPin className="h-4 w-4 text-[#C9A227]" />Lakeside dining</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]">7:00 AM – 11:00 PM</span></div>
              <div className="mt-7 flex flex-wrap gap-3"><a href="#menu" className="rounded-full bg-[#C9A227] px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-[#073B4C]">View Menu</a><Link href="/guest/my-activity" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-white">Reserve a Table</Link><Link href="/guest/my-activity" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-white">Order Now</Link></div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-2xl"><div className="flex h-[360px] items-end rounded-[1.5rem] bg-[linear-gradient(145deg,#E9D9B8,#B8D6D9_48%,#0B4F6C)] p-7"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#073B4C]/70">Ethiopian soul · modern table</p><p className="mt-2 max-w-sm text-2xl font-black tracking-[-.03em] text-[#073B4C]">A bright dining experience inspired by Hawassa.</p></div></div></div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <section id="menu"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]/55">Explore the menu</p><h2 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">Something for every table.</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map(([name, description, Icon]) => <article key={name} className="rounded-3xl border border-[#0B4F6C]/10 bg-white p-5 shadow-[0_15px_45px_rgba(7,59,76,.07)]"><Icon className="h-6 w-6 text-[#0B4F6C]" /><h3 className="mt-5 font-black">{name}</h3><p className="mt-2 text-sm leading-6 text-[#073B4C]/55">{description}</p><p className="mt-4 text-[10px] font-black uppercase tracking-[.16em] text-[#C9A227]">Explore category →</p></article>)}</div></section>
        <section className="mt-14"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]/55">Draft signatures</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Chef-inspired highlights.</h2></div><span className="rounded-full bg-[#F3E9D2] px-4 py-2 text-[10px] font-black uppercase tracking-[.15em]">Draft ETB prices</span></div><div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{dishes.map(([name, description, price]) => <article key={name} className="rounded-3xl border border-[#0B4F6C]/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><h3 className="font-black">{name}</h3><span className="shrink-0 text-sm font-black text-[#0B4F6C]">{price.toLocaleString()} ETB</span></div><p className="mt-3 text-sm leading-6 text-[#073B4C]/55">{description}</p></article>)}</div></section>
        <section className="mt-14 grid gap-6 lg:grid-cols-2"><div className="rounded-[2rem] bg-[#EAF4F7] p-7 md:p-9"><Coffee className="h-7 w-7 text-[#0B4F6C]" /><h2 className="mt-4 text-3xl font-black tracking-[-.04em]">Ethiopian coffee & modern coffee.</h2><p className="mt-3 text-sm leading-7 text-[#073B4C]/60">Experience Ethiopian coffee culture through a traditional ceremony, or choose from a modern coffee menu for a relaxed resort break.</p></div><div className="rounded-[2rem] border border-[#C9A227]/30 bg-[#F3E9D2]/55 p-7 md:p-9"><h2 className="text-3xl font-black tracking-[-.04em]">Dining your way.</h2><p className="mt-3 text-sm leading-7 text-[#073B4C]/60">Indoor, outdoor, lakeside and private/family dining are part of the Tule Restaurant experience.</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/80 px-3 py-2 text-xs font-bold">Indoor</span><span className="rounded-full bg-white/80 px-3 py-2 text-xs font-bold">Outdoor</span><span className="rounded-full bg-white/80 px-3 py-2 text-xs font-bold">Lakeside</span><span className="rounded-full bg-white/80 px-3 py-2 text-xs font-bold">Private</span></div></div></section>
        <section className="mt-14 rounded-[2rem] bg-[#0B4F6C] p-8 text-white md:p-10"><h2 className="text-3xl font-black tracking-[-.04em]">Reserve your table at Tule Restaurant.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">Choose a dining time, request a table or send a food order through the guest experience.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/guest/my-activity" className="rounded-full bg-[#C9A227] px-6 py-4 text-xs font-black uppercase tracking-[.13em] text-[#073B4C]">Reserve a Table</Link><Link href="/guest/my-activity" className="rounded-full border border-white/15 bg-white/10 px-6 py-4 text-xs font-black uppercase tracking-[.13em] text-white">Order Now</Link></div></section>
      </main>
    </div>
  );
}
