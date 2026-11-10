import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock3, MapPin, Sparkles, Utensils, BedDouble, Waves } from 'lucide-react';
import ResortServiceCard from '@/components/ResortServiceCard';
import { getResortServices } from '@/lib/resortServices';

export default async function GuestServicesPage() {
  const services = await getResortServices();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F5F0E6] text-[#26312D]">
      {/* ─── HEADER: Deep Forest Green & Champagne Gold ─── */}
      <header className="relative overflow-hidden border-b border-[#C5A46D]/20 bg-[#163D32] text-[#F5F0E6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,164,109,.15),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(138,155,131,.15),transparent_38%)]" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 py-4">
          <nav className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/70 hover:text-[#C5A46D] transition">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <Link href="/guest" className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3.5 py-1.5 backdrop-blur-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tule-resort-logo.png" alt="Tule Resort logo" className="h-9 w-9 rounded-lg object-contain" />
              <span className="hidden sm:block">
                <span className="block font-display text-sm font-semibold tracking-wide text-[#F5F0E6]">Tule Resort</span>
                <span className="block text-[8px] font-bold uppercase tracking-[.28em] text-[#C5A46D]">Hawassa</span>
              </span>
            </Link>
          </nav>

          <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:mt-12">
            <div className="max-w-4xl pb-10 md:pb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">
                <Sparkles className="h-4 w-4" /> Tule Resort Guest Experience
              </div>
              <h1 className="mt-5 font-display text-5xl md:text-7xl font-light tracking-tight leading-[.9]">
                Everything <br />
                <span className="italic font-normal text-[#C5A46D]">you need.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-sm md:text-base leading-relaxed text-[#F5F0E6]/80 font-normal">
                Explore dining, lakeside accommodation, wellness, swimming, fitness and curated experiences through our unified resort portal.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#F5F0E6]/70">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2">
                  <MapPin className="h-3.5 w-3.5 text-[#C5A46D]" /> Tule Resort • Lake Hawassa Shore
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2">
                  <Clock3 className="h-3.5 w-3.5 text-[#C5A46D]" /> 24/7 Guest Care
                </span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/guest/restaurant"
                  className="inline-flex items-center gap-2 rounded-full bg-[#C5A46D] px-6 py-3.5 text-xs font-black uppercase tracking-[.13em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20 transition duration-300 hover:bg-[#B8955E] hover:scale-[1.02]"
                >
                  <Utensils className="h-4 w-4" /> Open Dining Menu
                </Link>
                <Link
                  href="/guest/rooms"
                  className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#0F2D24] px-6 py-3.5 text-xs font-bold uppercase tracking-[.13em] text-[#F5F0E6] hover:border-[#C5A46D] transition"
                >
                  <BedDouble className="h-4 w-4 text-[#C5A46D]" /> Browse Rooms &amp; Suites
                </Link>
              </div>
            </div>

            <div className="hidden lg:block justify-self-end w-full max-w-md overflow-hidden rounded-[2.2rem] border border-[#C5A46D]/20 bg-[#0F2D24]/90 shadow-2xl p-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tule-resort-logo.png" alt="Tule Resort emblem" className="h-[280px] w-full object-contain drop-shadow-[0_8px_30px_rgba(197,164,109,0.2)]" />
              <div className="mt-4 border-t border-[#C5A46D]/20 pt-4">
                <p className="font-display text-xl text-[#F5F0E6]">Tule Resort · Hawassa</p>
                <p className="mt-1 text-xs text-[#C5A46D] uppercase tracking-widest font-bold">Relax. Enjoy. Remember.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT: Warm Ivory ─── */}
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-16">
        <div className="mb-8 flex items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.26em] text-[#8A9B83]">Explore the resort</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-medium tracking-tight text-[#26312D]">
              Services &amp; experiences
            </h2>
          </div>
          <span className="hidden sm:block text-xs font-bold text-[#8A9B83]">{services.length} experiences</span>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          {services.map((service, index) => (
            <ResortServiceCard key={service.id} service={service} index={index} />
          ))}
        </section>

        <section className="mt-12 rounded-[2.2rem] border border-[#163D32]/10 bg-white p-8 md:p-10 shadow-[0_12px_40px_rgba(22,61,50,0.05)]">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">The Tule way</p>
            <h3 className="mt-2 font-display text-2xl md:text-3xl font-medium tracking-tight text-[#26312D]">
              Hospitality, comfort and Ethiopian soul.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#26312D]/75">
              A serene Hawassa sanctuary built around warm hospitality, lake-fresh dining, restful stays and seamless guest services.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/guest/my-activity"
              className="inline-flex rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-6 py-3 text-xs font-black uppercase tracking-[.14em] text-[#F5F0E6] transition duration-200"
            >
              My Activity &amp; Orders
            </Link>
            <Link
              href="/guest/gallery"
              className="inline-flex rounded-full border border-[#163D32]/20 bg-[#F5F0E6] px-6 py-3 text-xs font-bold uppercase tracking-[.14em] text-[#26312D] hover:border-[#C5A46D] transition"
            >
              Resort Gallery
            </Link>
          </div>
        </section>
      </main>

      {/* ─── FOOTER: Deep Forest Green ─── */}
      <footer className="border-t border-[#163D32]/15 bg-[#0F2D24] text-[#F5F0E6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tule-resort-logo.png" alt="Tule Resort logo" className="h-12 w-12 rounded-xl object-contain bg-black/20 border border-white/10" />
            <div>
              <p className="font-display text-base font-semibold text-[#F5F0E6]">Tule Resort</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.25em] text-[#C5A46D]">Hawassa • Ethiopia</p>
            </div>
          </div>
          <p className="text-xs text-[#F5F0E6]/60">Relax. Enjoy. Remember.</p>
        </div>
      </footer>
    </div>
  );
}
