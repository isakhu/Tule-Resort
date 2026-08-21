'use client';

import Link from 'next/link';
import { ArrowRight, BedDouble, CalendarDays, MapPin, Phone, Sparkles, Utensils, Waves, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import { tuleBrand, tuleCopy, TuleLanguage } from '@/src/lib/tuleBrand';

export default function Home() {
  const [language, setLanguage] = useState<TuleLanguage>('en');
  const copy = tuleCopy[language];

  useEffect(() => {
    const onChange = (event: Event) => setLanguage((event as CustomEvent<TuleLanguage>).detail);
    window.addEventListener('tule-language-change', onChange);
    return () => window.removeEventListener('tule-language-change', onChange);
  }, []);

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#182326]">
      <section className="relative min-h-[88vh] overflow-hidden bg-[#0B3D4A] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(21,154,156,.55),transparent_30%),radial-gradient(circle_at_15%_80%,rgba(200,161,90,.24),transparent_32%),linear-gradient(145deg,#082F3A_0%,#0B3D4A_45%,#126A72_100%)]" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full border border-white/10 bg-white/[.03] blur-sm" />
        <div className="absolute -bottom-40 left-10 h-96 w-96 rounded-full border border-[#D8C7A3]/10 bg-[#D8C7A3]/5" />
        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/tule-resort-mark.svg" alt="Tule Resort" className="h-12 w-14 rounded-xl object-cover ring-1 ring-white/15" />
            <span><strong className="block font-display text-2xl tracking-tight">Tule Resort</strong><small className="block text-[8px] font-bold uppercase tracking-[.3em] text-white/55">{tuleBrand.subtitle}</small></span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[.13em] text-white/65 md:flex">
            <Link href="/guest/rooms" className="hover:text-white">{copy.exploreRooms}</Link>
            <Link href="/guest/restaurant" className="hover:text-white">{copy.dining}</Link>
            <Link href="/guest" className="hover:text-white">{copy.experiences}</Link>
            <Link href="#contact" className="hover:text-white">{copy.contact}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/staff/login" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2.5 text-[9px] font-black uppercase tracking-[.1em] text-white hover:bg-white/15" aria-label="Manager Login">
              <LockKeyhole className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Manager Login</span>
            </Link>
            <Link href="/guest/booking" className="hidden rounded-full bg-[#D8C7A3] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-[#182326] sm:block">{copy.book}</Link>
          </div>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-end gap-10 px-5 pb-16 pt-14 md:px-8 md:pb-24 lg:grid-cols-[1.15fr_.85fr] lg:pt-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-[.24em] text-[#D8C7A3]"><Sparkles className="h-3.5 w-3.5" />{copy.homeEyebrow}</div>
            <h1 className="mt-6 font-display text-6xl font-semibold leading-[.88] tracking-[-.04em] md:text-8xl lg:text-[7.8rem]">{copy.homeTitle}</h1>
            <p className="mt-7 max-w-xl text-sm leading-7 text-white/65 md:text-base">{copy.homeDescription}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/guest/booking" className="inline-flex items-center gap-2 rounded-full bg-[#D8C7A3] px-6 py-3.5 text-xs font-black uppercase tracking-[.12em] text-[#182326] shadow-xl shadow-black/10 hover:scale-[1.02]"><CalendarDays className="h-4 w-4" />{copy.book}<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/guest/rooms" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3.5 text-xs font-black uppercase tracking-[.12em] text-white hover:bg-white/15"><BedDouble className="h-4 w-4" />{copy.exploreRooms}</Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[.07] p-3 shadow-2xl backdrop-blur">
            <div className="relative flex min-h-[360px] items-end overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(21,154,156,.12),rgba(5,35,43,.8)),radial-gradient(circle_at_50%_15%,rgba(216,199,163,.25),transparent_25%)] p-6">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.45))]" />
              <div className="relative"><p className="text-[9px] font-black uppercase tracking-[.25em] text-[#D8C7A3]">TULE RESORT</p><p className="mt-2 max-w-xs font-display text-4xl leading-none">{tuleBrand.tagline}</p><div className="mt-5 flex items-center gap-2 text-xs text-white/60"><MapPin className="h-4 w-4" />{tuleBrand.address}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-5 md:grid-cols-3">
          <Link href="/guest/rooms" className="group rounded-[1.7rem] border border-[#0B3D4A]/10 bg-white p-7 shadow-sm transition hover:-translate-y-1"><BedDouble className="h-6 w-6 text-[#159A9C]" /><h2 className="mt-8 font-display text-3xl">Stay by the lake</h2><p className="mt-2 text-sm leading-6 text-[#182326]/55">Comfortable rooms, clear booking flow, and a stay designed around rest.</p><span className="mt-5 inline-flex text-[10px] font-black uppercase tracking-[.15em] text-[#0B3D4A]">Explore rooms <ArrowRight className="ml-2 h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></Link>
          <Link href="/guest/restaurant" className="group rounded-[1.7rem] border border-[#0B3D4A]/10 bg-[#0B3D4A] p-7 text-white shadow-sm transition hover:-translate-y-1"><Utensils className="h-6 w-6 text-[#D8C7A3]" /><h2 className="mt-8 font-display text-3xl">Taste Tule</h2><p className="mt-2 text-sm leading-6 text-white/55">Ethiopian flavors and resort dining, presented with a modern hospitality feel.</p><span className="mt-5 inline-flex text-[10px] font-black uppercase tracking-[.15em] text-[#D8C7A3]">Explore dining <ArrowRight className="ml-2 h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></Link>
          <Link href="/guest" className="group rounded-[1.7rem] border border-[#0B3D4A]/10 bg-[#D8C7A3]/25 p-7 shadow-sm transition hover:-translate-y-1"><Waves className="h-6 w-6 text-[#0B3D4A]" /><h2 className="mt-8 font-display text-3xl">Experience Hawassa</h2><p className="mt-2 text-sm leading-6 text-[#182326]/55">Discover resort services, leisure, wellness and experiences in one place.</p><span className="mt-5 inline-flex text-[10px] font-black uppercase tracking-[.15em] text-[#0B3D4A]">Discover more <ArrowRight className="ml-2 h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></Link>
        </div>
      </section>

      <footer id="contact" className="bg-[#182326] px-5 py-12 text-white md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div><p className="font-display text-4xl">Tule Resort</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.28em] text-[#D8C7A3]">{tuleBrand.subtitle}</p><p className="mt-4 max-w-sm text-sm leading-6 text-white/50">{tuleBrand.address}</p></div>
          <div className="text-sm text-white/65"><p className="mb-2 flex items-center gap-2"><Phone className="h-4 w-4 text-[#159A9C]" />{tuleBrand.phones[0]}</p><p className="pl-6">{tuleBrand.phones[1]}</p></div>
          <div><a href={`mailto:${tuleBrand.email}`} className="text-sm text-[#D8C7A3] hover:underline">{tuleBrand.email}</a></div>
        </div>
      </footer>
    </main>
  );
}
