import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock3, MapPin, Sparkles } from 'lucide-react';
import ResortServiceCard from '@/components/ResortServiceCard';
import { getResortServices } from '@/lib/resortServices';

export default async function GuestServicesPage() {
  const services = await getResortServices();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0C0B09] text-white">
      <header className="relative overflow-hidden border-b border-white/10 bg-[#17120D]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,184,75,.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(20,118,132,.18),transparent_38%)]" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 py-4">
          <nav className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white transition"><ArrowLeft className="h-4 w-4" />Home</Link>
            <Link href="/guest" className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-md">
              <img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-10 w-14 rounded-lg object-cover" />
              <span className="hidden sm:block"><span className="block text-sm font-black uppercase tracking-[.16em] text-[#F2C866]">Tule Resort</span><span className="block text-[8px] font-bold uppercase tracking-[.28em] text-white/45">Hawassa</span></span>
            </Link>
          </nav>

          <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:mt-12">
            <div className="max-w-4xl pb-10 md:pb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F2B84B]/20 bg-[#F2B84B]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#F2B84B]"><Sparkles className="h-4 w-4" />Tule Resort Guest Experience</div>
              <h1 className="mt-5 text-6xl md:text-8xl font-black uppercase tracking-[-.07em] leading-[.82]">Everything<br /><span className="text-[#F2B84B]">you need.</span></h1>
              <p className="mt-6 max-w-2xl text-sm md:text-base leading-relaxed text-white/60">Explore dining, accommodation, wellness, leisure, fitness and event services through one visual guest experience.</p>
              <div className="mt-7 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-white/55"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><MapPin className="h-3.5 w-3.5" />Tule Resort • Hawassa</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><Clock3 className="h-3.5 w-3.5" />Guest services</span></div>
            </div>
            <div className="hidden lg:block justify-self-end w-full max-w-md overflow-hidden rounded-[2rem] border border-[#F2B84B]/20 bg-black/30 shadow-2xl shadow-black/40">
              <img src="/tule-resort-mark.svg" alt="Tule Resort palm, pavilion and water mark" className="h-[330px] w-full object-cover" />
              <div className="border-t border-white/10 px-6 py-4"><p className="text-[9px] font-black uppercase tracking-[.28em] text-[#F2B84B]">TULE-RESORT • HAWASSA</p><p className="mt-1 text-sm text-white/55">Relax. Enjoy. Remember.</p></div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 flex items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.26em] text-white/35">Explore the resort</p><h2 className="mt-2 text-3xl md:text-4xl font-black tracking-[-.04em]">Services & experiences</h2></div><span className="hidden sm:block text-xs text-white/35">{services.length} experiences</span></div>
        <section className="grid gap-5 md:grid-cols-2">{services.map((service, index) => <ResortServiceCard key={service.id} service={service} index={index} />)}</section>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[.035] p-6 md:p-8"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#F2B84B]">The Tule way</p><h3 className="mt-2 text-2xl md:text-3xl font-black tracking-[-.03em]">Hospitality, comfort and Ethiopian soul.</h3><p className="mt-3 text-sm leading-relaxed text-white/50">A modern Hawassa resort experience built around warm hospitality, memorable dining, comfortable stays and easy guest services.</p></div><div className="mt-6"><Link href="/guest/my-activity" className="inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-white/70">My activity</Link></div></section>
      </main>

      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-4"><img src="/tule-resort-mark.svg" alt="Tule Resort logo" className="h-16 w-20 rounded-xl object-cover" /><div><p className="text-sm font-black uppercase tracking-[.18em] text-[#F2C866]">Tule Resort</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.25em] text-white/35">Hawassa • Ethiopia</p></div></div>
          <p className="text-xs text-white/35">Relax. Enjoy. Remember.</p>
        </div>
      </footer>
    </div>
  );
}
