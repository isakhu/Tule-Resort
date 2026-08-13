import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock3, MapPin, Sparkles } from 'lucide-react';
import ResortServiceCard from '@/components/ResortServiceCard';
import { getResortServices } from '@/lib/resortServices';

export default async function GuestServicesPage() {
  const services = await getResortServices();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0C0B09] text-white pb-16">
      <header className="relative overflow-hidden border-b border-white/10 bg-[#17120D]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,184,75,.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(229,107,77,.12),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white transition"><ArrowLeft className="h-4 w-4" />Home</Link>
          <div className="mt-12 max-w-4xl pb-10 md:pb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F2B84B]/20 bg-[#F2B84B]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#F2B84B]"><Sparkles className="h-4 w-4" />Haile Resort Guest Experience</div>
            <h1 className="mt-5 text-6xl md:text-8xl font-black uppercase tracking-[-.07em] leading-[.82]">Everything<br /><span className="text-[#F2B84B]">you need.</span></h1>
            <p className="mt-6 max-w-2xl text-sm md:text-base leading-relaxed text-white/60">Explore dining, accommodation, wellness, leisure, fitness and event services through one visual guest experience.</p>
            <div className="mt-7 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-white/55"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><MapPin className="h-3.5 w-3.5" />Haile Hotels & Resorts</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><Clock3 className="h-3.5 w-3.5" />Guest services</span></div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 flex items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.26em] text-white/35">Explore the resort</p><h2 className="mt-2 text-3xl md:text-4xl font-black tracking-[-.04em]">Services & experiences</h2></div><span className="hidden sm:block text-xs text-white/35">{services.length} experiences</span></div>
        <section className="grid gap-5 md:grid-cols-2">{services.map((service, index) => <ResortServiceCard key={service.id} service={service} index={index} />)}</section>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[.035] p-6 md:p-8"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#F2B84B]">The Haile way</p><h3 className="mt-2 text-2xl md:text-3xl font-black tracking-[-.03em]">Hospitality, comfort and Ethiopian soul.</h3><p className="mt-3 text-sm leading-relaxed text-white/50">The service catalog follows the official Haile Hotels & Resorts service categories and experience themes, while keeping the guest interface focused and easy to use.</p></div><div className="mt-6"><Link href="/guest/my-activity" className="inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-white/70">My activity</Link></div></section>
      </main>
    </div>
  );
}
