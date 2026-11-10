'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Calendar,
  Check,
  Compass,
  Lock,
  MapPin,
  Maximize2,
  Phone,
  Play,
  QrCode,
  Sparkles,
  Sun,
  Users,
  UtensilsCrossed,
  Waves,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TuleResortDiorama from '@/components/TuleResortDiorama';
import { tuleCopy, TuleLanguage } from '@/lib/tuleBrand';

const experiences = [
  {
    eyebrow: 'GUEST ROOMS',
    title: 'Find a room for your Hawassa stay.',
    description: 'Compare available rooms and choose the dates that work for your visit.',
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
    alt: 'Hotel guest room interior',
    href: '/guest/rooms',
    action: 'View rooms',
    icon: BedDouble,
    number: '01',
  },
  {
    eyebrow: 'RESTAURANT MENU',
    title: 'Browse the restaurant menu.',
    description: 'See the dishes on the menu, then use the table-ordering page when you are ready.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
    alt: 'Restaurant dining area',
    href: '/guest/restaurant',
    action: 'Open menu',
    icon: UtensilsCrossed,
    number: '02',
  },
  {
    eyebrow: 'GUEST SERVICES',
    title: 'Check guest services.',
    description: 'Review the services listed by Tule Resort and find the options relevant to your visit.',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85',
    alt: 'Pool area surrounded by greenery',
    href: '/guest/services',
    action: 'View services',
    icon: Waves,
    number: '03',
  },
];

export default function Home() {
  const [language, setLanguage] = useState<TuleLanguage>('en');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const copy = tuleCopy[language];
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [guests, setGuests] = useState('2');
  const [roomType, setRoomType] = useState('all');

  useEffect(() => {
    const onChange = (event: Event) =>
      setLanguage((event as CustomEvent<TuleLanguage>).detail);
    window.addEventListener('tule-language-change', onChange);

    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: '0px 0px -40px 0px' },
      );
      elements.forEach((element) => observer.observe(element));
      return () => {
        observer.disconnect();
        window.removeEventListener('tule-language-change', onChange);
      };
    }

    return () => window.removeEventListener('tule-language-change', onChange);
  }, []);

  const handleHeroPointer = (event: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  };

  const resetHeroPointer = () => setTilt({ x: 0, y: 0 });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5F0E6] text-[#26312D]">
      {/* ─── HEADER — Deep Forest Green ─── */}
      <header className="relative z-40 border-b border-[#C5A46D]/20 bg-[#163D32] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-7 lg:px-10">
          <Link href="/" aria-label="Tule Resort home" className="group flex shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-transform duration-500 group-hover:scale-105 sm:h-12 sm:w-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tule-resort-logo.png" alt="Tule Resort" className="h-full w-full object-contain drop-shadow-[0_4px_18px_rgba(197,164,109,.25)]" />
            </span>
            <span>
              <span className="block font-display text-xl font-semibold leading-none tracking-wide sm:text-2xl text-[#F5F0E6]">Tule Resort</span>
              <span className="mt-1 block text-[8px] font-extrabold uppercase tracking-[.28em] text-[#C5A46D] sm:text-[9px]">Hawassa · Ethiopia</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[11px] font-bold uppercase tracking-[.15em] text-[#F5F0E6]/70 lg:flex">
            <Link href="/guest/rooms" className="transition-colors hover:text-[#C5A46D]">{copy.exploreRooms}</Link>
            <Link href="/guest/restaurant" className="transition-colors hover:text-[#C5A46D]">{copy.dining}</Link>
            <Link href="/guest/services" className="transition-colors hover:text-[#C5A46D]">{copy.experiences}</Link>
            <Link href="/guest/table/tule-tbl-01-lakeview" className="transition-colors hover:text-[#C5A46D]">Open table ordering</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link href="/staff/login" className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[#F5F0E6]/75 transition hover:border-[#C5A46D]/70 hover:text-[#C5A46D] sm:inline-flex">
              <Lock className="h-3 w-3" /> Staff
            </Link>
            <Link href="/guest/rooms" className="group inline-flex items-center gap-2 rounded-full bg-[#C5A46D] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-[#163D32] shadow-[0_8px_30px_rgba(197,164,109,.25)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#B8955E] sm:px-5">
              {copy.book}<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION — Dark overlay on photography ─── */}
      <section
        className="tule-hero relative isolate flex min-h-[700px] items-center overflow-hidden sm:min-h-[780px] lg:min-h-[calc(100svh-76px)]"
        onMouseMove={handleHeroPointer}
        onMouseLeave={resetHeroPointer}
      >
        <div
          aria-hidden="true"
          className="tule-hero-image absolute -inset-5 -z-30"
          style={{
            transform: `translate3d(${tilt.x * -10}px, ${tilt.y * -7}px, 0) scale(1.055)`,
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(22,61,50,.92)_0%,rgba(22,61,50,.78)_44%,rgba(22,61,50,.22)_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(0deg,#163D32_0%,rgba(22,61,50,.1)_35%,rgba(22,61,50,.12)_75%,rgba(22,61,50,.55)_100%)]" />
        <div aria-hidden="true" className="tule-ambient-glow pointer-events-none absolute -right-44 top-12 -z-10 h-[34rem] w-[34rem] rounded-full" />

        {/* Topographic Contour Motifs */}
        <svg aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-10 z-0 h-[460px] w-[460px] opacity-[0.12] text-[#C5A46D]" viewBox="0 0 500 500" fill="none" stroke="currentColor">
          <circle cx="250" cy="250" r="230" strokeWidth="0.8" strokeDasharray="3 4" />
          <path d="M70,250 C120,200 180,210 230,170 C280,130 330,150 430,180" strokeWidth="1" />
          <path d="M50,280 C110,230 170,240 220,200 C270,160 340,190 450,220" strokeWidth="0.8" />
          <path d="M90,320 C140,270 200,280 250,240 C300,200 360,230 430,260" strokeWidth="1.2" />
          <path d="M120,360 C170,310 230,320 280,280 C330,240 380,270 410,300" strokeWidth="0.8" />
          <text x="250" y="275" fontSize="8" letterSpacing="3" fill="currentColor" stroke="none">LAKE HAWASSA · 1,685M</text>
          <text x="250" y="290" fontSize="7" letterSpacing="2" fill="currentColor" opacity="0.7" stroke="none">7°03′N · 38°28′E</text>
        </svg>

        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 px-4 pb-20 pt-20 sm:px-7 sm:pb-24 sm:pt-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:gap-8 lg:px-10 lg:py-20 xl:gap-16">
          <div className="relative z-10 max-w-3xl">
            {/* Eyebrow */}
            <div className="tule-intro inline-flex flex-wrap items-center gap-2.5 rounded-full border border-[#C5A46D]/35 bg-[#163D32]/80 px-4 py-2 text-[9px] font-extrabold uppercase tracking-[.22em] text-[#F5F0E6] shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md sm:text-[10px]">
              <span className="flex h-2 w-2 rounded-full bg-[#C5A46D] shadow-[0_0_8px_#C5A46D]" />
              <MapPin className="h-3 w-3 text-[#C5A46D]" />
              <span className="text-[#C5A46D]">Hawassa · Ethiopia</span>
              <span className="h-3 w-px bg-[#C5A46D]/30" />
              <span>7°03′N 38°28′E</span>
              <span className="hidden h-3 w-px bg-[#C5A46D]/30 sm:block" />
              <span className="hidden text-[#F5F0E6]/75 sm:inline">Lakefront Sanctuary</span>
            </div>

            <h1 className="tule-intro mt-4 max-w-4xl font-display text-[clamp(4.2rem,9.5vw,8.8rem)] font-light leading-[.84] tracking-[-.025em] text-[#F5F0E6]" style={{ animationDelay: '140ms' }}>
              TULE RESORT
            </h1>

            <div className="tule-intro mt-3 flex items-center gap-3" style={{ animationDelay: '200ms' }}>
              <span className="h-px w-8 bg-[#C5A46D]/60" />
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[.36em] text-[#C5A46D]">
                HAWASSA · ETHIOPIA
              </p>
            </div>

            <p className="tule-intro mt-4 font-display text-2xl sm:text-3xl italic tracking-wide text-[#F5F0E6]/90" style={{ animationDelay: '260ms' }}>
              Relax. Enjoy. Remember.
            </p>

            {/* Action Buttons */}
            <div className="tule-intro mt-8 flex flex-wrap items-center gap-3 sm:mt-9" style={{ animationDelay: '320ms' }}>
              <Link
                href="/guest/rooms"
                className="tule-btn-shimmer group inline-flex items-center gap-3 rounded-full bg-[#C5A46D] px-7 py-4 text-[10px] font-black uppercase tracking-[.15em] text-[#163D32] shadow-[0_10px_35px_rgba(197,164,109,.3)] transition duration-300 hover:-translate-y-1 hover:bg-[#B8955E] hover:shadow-[0_14px_42px_rgba(197,164,109,.4)] active:scale-95"
              >
                {copy.exploreRooms} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/guest/restaurant"
                className="tule-btn-shimmer inline-flex items-center gap-2.5 rounded-full border border-[#C5A46D]/40 bg-[#163D32]/60 px-6 py-4 text-[10px] font-bold uppercase tracking-[.14em] text-[#F5F0E6] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#C5A46D] hover:bg-[#163D32] active:scale-95"
              >
                <UtensilsCrossed className="h-3.5 w-3.5 text-[#C5A46D]" /> {copy.dining}
              </Link>
              <Link
                href="/guest/table/tule-tbl-01-lakeview"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-4 text-[10px] font-bold uppercase tracking-[.13em] text-[#F5F0E6]/80 backdrop-blur-md transition duration-300 hover:text-white hover:border-white/30"
              >
                <QrCode className="h-3.5 w-3.5 text-[#C5A46D]" /> Table QR
              </Link>
            </div>

            {/* Metadata Strip */}
            <div className="tule-intro mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#C5A46D]/20 pt-5 text-[9px] font-bold uppercase tracking-[.18em] text-[#F5F0E6]/65 sm:mt-11 sm:pt-6" style={{ animationDelay: '380ms' }}>
              <span className="inline-flex items-center gap-2 text-[#F5F0E6]">
                <MapPin className="h-3.5 w-3.5 text-[#C5A46D]" /> Lake Hawassa Shore, Sidama, Ethiopia
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-[#C5A46D] sm:block" />
              <span className="text-[#C5A46D]">Boutique Lakeside Destination</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#C5A46D] sm:block" />
              <span>Elevation 1,685m</span>
            </div>
          </div>

          {/* Reservation Card */}
          <div className="relative mx-auto w-full max-w-[440px] lg:block">
            <div
              className="tule-3d-frame relative w-full"
              style={{
                transform: `rotateY(${tilt.x * 4}deg) rotateX(${tilt.y * -3}deg)`,
              }}
            >
              <div className="rounded-[2.2rem] border border-[#C5A46D]/30 bg-[#163D32]/90 p-6 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-[#C5A46D]/20 pb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[.24em] text-[#C5A46D]">Direct Reservations</span>
                    <h3 className="font-display text-2xl text-[#F5F0E6] leading-tight">Plan Your Stay</h3>
                  </div>
                  <span className="rounded-full bg-[#0F2D24] border border-[#C5A46D]/40 px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-[#F5F0E6]">
                    Best Rate
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#0F2D24]/80 p-2.5">
                      <label className="text-[8px] font-bold uppercase tracking-[.18em] text-[#C5A46D] flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Check-in
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-[#F5F0E6] outline-none"
                      />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0F2D24]/80 p-2.5">
                      <label className="text-[8px] font-bold uppercase tracking-[.18em] text-[#C5A46D] flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Check-out
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-[#F5F0E6] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#0F2D24]/80 p-2.5">
                      <label className="text-[8px] font-bold uppercase tracking-[.18em] text-[#C5A46D] flex items-center gap-1">
                        <Users className="h-3 w-3" /> Guests
                      </label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-[#F5F0E6] outline-none"
                      >
                        <option value="1" className="bg-[#163D32]">1 Guest</option>
                        <option value="2" className="bg-[#163D32]">2 Guests</option>
                        <option value="3" className="bg-[#163D32]">3 Guests</option>
                        <option value="4" className="bg-[#163D32]">4+ Family</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0F2D24]/80 p-2.5">
                      <label className="text-[8px] font-bold uppercase tracking-[.18em] text-[#C5A46D] flex items-center gap-1">
                        <BedDouble className="h-3 w-3" /> Suites
                      </label>
                      <select
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value)}
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-[#F5F0E6] outline-none"
                      >
                        <option value="all" className="bg-[#163D32]">All Suites</option>
                        <option value="lake" className="bg-[#163D32]">Lake View</option>
                        <option value="garden" className="bg-[#163D32]">Garden View</option>
                        <option value="suites" className="bg-[#163D32]">Luxury Suites</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Resort Perks */}
                  <div className="pt-1 grid grid-cols-2 gap-2 text-[9px] font-bold text-[#F5F0E6]/85">
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <Sun className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>24°C Lake Breeze</span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>Free Breakfast</span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <Waves className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>Heated Pool</span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>Pier Open</span>
                    </span>
                  </div>

                  <Link
                    href={`/guest/rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}${roomType !== 'all' ? `&type=${roomType}` : ''}`}
                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#C5A46D] py-3.5 text-xs font-black uppercase tracking-[.14em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20 hover:bg-[#B8955E] transition active:scale-95"
                  >
                    Check Availability &amp; Rates <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link href="#accommodations" className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[8px] font-bold uppercase tracking-[.25em] text-[#F5F0E6]/60 transition hover:text-white sm:bottom-7">
          Explore suites and rooms <ArrowDown className="h-4 w-4 animate-bounce text-[#C5A46D]" />
        </Link>
      </section>

      {/* ─── SECTION 2: FEATURED ROOMS & SUITES — Warm Ivory bg ─── */}
      <section id="accommodations" className="relative z-10 bg-[#F5F0E6] px-4 py-20 sm:px-7 sm:py-28 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          {/* Section Header */}
          <div data-reveal className="tule-reveal mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#163D32]/8 px-3.5 py-1 text-[9px] font-extrabold uppercase tracking-[.26em] text-[#163D32] backdrop-blur-md">
                <BedDouble className="h-3 w-3" /> Accommodations · Hawassa
              </div>
              <h2 className="mt-4 font-display text-4xl font-light leading-[1.02] tracking-tight text-[#26312D] sm:text-6xl lg:text-7xl">
                Wake Up to <span className="italic font-normal text-[#C5A46D]">Lake Hawassa</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#26312D]/70 sm:text-base">
                8 lakefront suites and garden bungalows crafted with natural timber, stone, and private sunset balconies.
              </p>
            </div>

            <Link
              href="/guest/rooms"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#C5A46D] hover:text-[#163D32] transition group shrink-0"
            >
              Explore All 8 Suites &amp; Rates <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </Link>
          </div>

          {/* Editorial Grid */}
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 items-stretch">
            {/* Left Spotlight Suite */}
            <article
              data-reveal
              className="tule-reveal group relative flex flex-col justify-end overflow-hidden rounded-[2.2rem] border border-[#163D32]/10 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.08)] lg:col-span-7 min-h-[580px] lg:min-h-[640px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=85"
                alt="Deluxe One-Bedroom Suite at Tule Resort"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/60 to-black/10" />

              <div className="absolute left-6 right-6 top-6 flex items-center justify-between z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A46D]/40 bg-[#163D32]/80 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[.22em] text-[#C5A46D] backdrop-blur-md shadow-md">
                  <Sparkles className="h-3 w-3" /> Featured Spotlight
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available Today
                </span>
              </div>

              <div className="relative z-10 p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#C5A46D]">
                  <span>Lake Hawassa View</span>
                  <span>•</span>
                  <span>Private Jacuzzi</span>
                  <span>•</span>
                  <span>VIP Lounge Access</span>
                </div>

                <h3 className="mt-2 font-display text-3xl font-medium text-[#F5F0E6] sm:text-4xl lg:text-5xl">
                  Deluxe One-Bedroom Suite
                </h3>

                <p className="mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-[#F5F0E6]/80">
                  Separated master bedroom, stylish living salon, private lakefront sunset terrace, and en-suite jacuzzi bath designed for unhurried luxury.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold text-[#F5F0E6]/85">
                  <span className="rounded-lg bg-[#163D32]/80 border border-white/10 px-2.5 py-1">60 m²</span>
                  <span className="rounded-lg bg-[#163D32]/80 border border-white/10 px-2.5 py-1">1 King Bed + Lounge</span>
                  <span className="rounded-lg bg-[#163D32]/80 border border-white/10 px-2.5 py-1">Up to 4 Guests</span>
                  <span className="rounded-lg bg-[#163D32]/80 border border-white/10 px-2.5 py-1">Buffet Breakfast Included</span>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#C5A46D]/20 pt-5">
                  <div>
                    <span className="block text-[8px] font-extrabold uppercase tracking-widest text-[#C5A46D]">Nightly Rate</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-2xl sm:text-3xl font-bold text-[#F5F0E6]">26,000 ETB</span>
                      <span className="text-xs text-[#F5F0E6]/60">/ night</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/guest/rooms/deluxe-one-bedroom-suite-lake-view"
                      className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#F5F0E6] transition hover:bg-white/10"
                    >
                      View Details
                    </Link>
                    <Link
                      href="/guest/rooms/deluxe-one-bedroom-suite-lake-view/book"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#C5A46D] px-5 py-2.5 text-[10px] font-black uppercase tracking-[.14em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20 hover:bg-[#B8955E] transition active:scale-95"
                    >
                      Book Suite <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            {/* Right Column: 2 Companion Suites */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Companion 1: Deluxe Double Room */}
              <article
                data-reveal
                className="tule-reveal group relative flex flex-col justify-end overflow-hidden rounded-[2.2rem] border border-[#163D32]/10 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex-1 min-h-[300px]"
                style={{ transitionDelay: '100ms' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
                  alt="Deluxe Double Room Lake View"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/65 to-black/10" />

                <div className="absolute left-5 right-5 top-5 flex items-center justify-between z-10">
                  <span className="rounded-full border border-[#C5A46D]/30 bg-[#163D32]/80 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-[#C5A46D] backdrop-blur-md">
                    Lake Panorama
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 text-[8px] font-bold uppercase text-emerald-300 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available
                  </span>
                </div>

                <div className="relative z-10 p-5 sm:p-6">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#C5A46D]">Lake Hawassa Shoreline</span>
                  <h3 className="mt-1 font-display text-2xl font-medium text-[#F5F0E6] sm:text-3xl">
                    Deluxe Double Room
                  </h3>
                  <p className="mt-1.5 text-xs text-[#F5F0E6]/75 line-clamp-2">
                    Panoramic sunrise vistas, private furnished balcony, king-sized bed, and modern walk-in shower.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-semibold text-[#F5F0E6]/80">
                    <span className="rounded bg-[#163D32]/80 border border-white/10 px-2 py-0.5">38 m²</span>
                    <span className="rounded bg-[#163D32]/80 border border-white/10 px-2 py-0.5">1 King Bed</span>
                    <span className="rounded bg-[#163D32]/80 border border-white/10 px-2 py-0.5">Breakfast</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#C5A46D]/20 pt-3">
                    <div>
                      <span className="font-display text-xl font-bold text-[#F5F0E6]">15,000 ETB</span>
                      <span className="text-[10px] text-[#F5F0E6]/60"> / night</span>
                    </div>
                    <Link
                      href="/guest/rooms/deluxe-double-lake-view/book"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#C5A46D] px-3.5 py-2 text-[9px] font-black uppercase tracking-wider text-[#163D32] transition hover:bg-[#B8955E] active:scale-95"
                    >
                      Book Room <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </article>

              {/* Companion 2: Classic Queen Room */}
              <article
                data-reveal
                className="tule-reveal group relative flex flex-col justify-end overflow-hidden rounded-[2.2rem] border border-[#163D32]/10 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] flex-1 min-h-[300px]"
                style={{ transitionDelay: '200ms' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"
                  alt="Classic Queen Room Garden View"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/65 to-black/10" />

                <div className="absolute left-5 right-5 top-5 flex items-center justify-between z-10">
                  <span className="rounded-full border border-[#C5A46D]/30 bg-[#163D32]/80 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-[#C5A46D] backdrop-blur-md">
                    Garden Oasis
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 text-[8px] font-bold uppercase text-emerald-300 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available
                  </span>
                </div>

                <div className="relative z-10 p-5 sm:p-6">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#C5A46D]">Tropical Courtyard</span>
                  <h3 className="mt-1 font-display text-2xl font-medium text-[#F5F0E6] sm:text-3xl">
                    Classic Queen Room
                  </h3>
                  <p className="mt-1.5 text-xs text-[#F5F0E6]/75 line-clamp-2">
                    Peaceful retreat facing tropical flora with private terrace seating, queen bed, and walk-in rain shower.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-semibold text-[#F5F0E6]/80">
                    <span className="rounded bg-[#163D32]/80 border border-white/10 px-2 py-0.5">32 m²</span>
                    <span className="rounded bg-[#163D32]/80 border border-white/10 px-2 py-0.5">1 Queen Bed</span>
                    <span className="rounded bg-[#163D32]/80 border border-white/10 px-2 py-0.5">Free Wi-Fi</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#C5A46D]/20 pt-3">
                    <div>
                      <span className="font-display text-xl font-bold text-[#F5F0E6]">11,500 ETB</span>
                      <span className="text-[10px] text-[#F5F0E6]/60"> / night</span>
                    </div>
                    <Link
                      href="/guest/rooms/classic-queen-room/book"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#C5A46D] px-3.5 py-2 text-[9px] font-black uppercase tracking-wider text-[#163D32] transition hover:bg-[#B8955E] active:scale-95"
                    >
                      Book Room <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: EXPLORE EXPERIENCES — Warm Ivory bg ─── */}
      <section id="experiences" className="relative z-10 bg-[#F5F0E6] px-4 py-20 sm:px-7 sm:py-28 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div data-reveal className="tule-reveal mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[9px] font-extrabold uppercase tracking-[.32em] text-[#C5A46D] sm:text-[10px]">Explore Tule Resort</p>
              <h2 className="mt-4 font-display text-5xl font-medium leading-[.95] tracking-[-.035em] text-[#26312D] sm:text-6xl lg:text-7xl">Rooms, dining and <span className="italic text-[#C5A46D]">guest services.</span></h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#26312D]/65">Compare room options, open the restaurant menu, or view the services listed for resort guests.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 md:gap-4 xl:gap-6">
            {experiences.map((experience, index) => {
              const Icon = experience.icon;
              return (
                <article key={experience.number} data-reveal className="tule-reveal tule-card-interactive group relative min-h-[450px] overflow-hidden rounded-[1.6rem] border border-[#163D32]/10 bg-white" style={{ transitionDelay: `${index * 100}ms` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={experience.image} alt={experience.alt} loading="lazy" className="tule-experience-image absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/55 to-[#163D32]/5" />
                  <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                    <span className="rounded-full border border-[#C5A46D]/30 bg-[#163D32]/70 px-3 py-2 text-[8px] font-extrabold uppercase tracking-[.2em] text-[#F5F0E6] backdrop-blur-md">{experience.eyebrow}</span>
                    <span className="font-display text-2xl italic text-[#C5A46D]">{experience.number}</span>
                  </div>
                  <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C5A46D]/30 bg-[#163D32]/50 text-[#C5A46D] backdrop-blur-md"><Icon className="h-5 w-5" /></span>
                    <h3 className="max-w-sm font-display text-3xl leading-[1.02] text-[#F5F0E6] sm:text-4xl">{experience.title}</h3>
                    <p className="mt-3 max-w-sm text-xs leading-6 text-[#F5F0E6]/75 sm:text-sm">{experience.description}</p>
                    <Link href={experience.href} className="mt-5 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#C5A46D] transition-colors hover:text-[#F5F0E6]">
                      {experience.action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CINEMATIC VIDEO SHOWCASE — Forest Green bg ─── */}
      <section className="relative overflow-hidden bg-[#163D32] px-4 py-16 sm:px-7 sm:py-24 lg:px-10 lg:py-28">
        <div aria-hidden="true" className="tule-ambient-glow pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        
        <div className="mx-auto max-w-[1440px]">
          <div data-reveal className="tule-reveal mb-8 flex flex-col gap-4 text-center items-center md:mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/35 bg-[#0F2D24]/80 px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-[.24em] text-[#C5A46D] backdrop-blur-md">
              <Play className="h-3 w-3 fill-current" /> Cinematic Lake Tour
            </span>
            <h2 className="font-display text-4xl font-medium tracking-tight text-[#F5F0E6] sm:text-5xl lg:text-6xl">
              Experience the atmosphere of <span className="italic text-[#C5A46D]">Tule Resort.</span>
            </h2>
            <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-[#F5F0E6]/65">
              Take an aerial and lakeside journey through our sunlit pools, private pier, sunset dining, and tranquil waters of Lake Hawassa.
            </p>
          </div>

          <div data-reveal className="tule-reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#C5A46D]/15 bg-[#0F2D24] shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <video
                src="/tule-resort-cinematic.mp4"
                poster="/tule-hero-visual.jpg"
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#163D32]/85 via-transparent to-black/15" />
              
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7 flex items-end justify-between pointer-events-none">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#163D32]/85 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#C5A46D] backdrop-blur-md border border-[#C5A46D]/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C5A46D] animate-pulse" /> Live Footage
                  </span>
                  <p className="mt-2 font-display text-2xl sm:text-3xl text-[#F5F0E6]">Hawassa Lake Shoreline</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#F5F0E6]/65">Poolside · Private Pier · Sunset Terrace</p>
                </div>
                
                <Link
                  href="/guest/rooms"
                  className="pointer-events-auto tule-btn-shimmer hidden sm:inline-flex items-center gap-2 rounded-full bg-[#C5A46D] px-5 py-3 text-[10px] font-black uppercase tracking-[.14em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20 transition duration-300 hover:bg-[#B8955E] hover:scale-105 active:scale-95"
                >
                  Book Stay <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── GUEST LINKS STRIP — Sage/Forest accent ─── */}
      <section className="relative overflow-hidden border-y border-[#163D32]/10 bg-[#163D32] px-4 py-14 sm:px-7 sm:py-18 lg:px-10 lg:py-20">
        <div aria-hidden="true" className="absolute -right-20 -top-32 h-96 w-96 rounded-full border border-[#C5A46D]/10" />
        <div aria-hidden="true" className="absolute -right-8 -top-20 h-72 w-72 rounded-full border border-[#8A9B83]/20" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div data-reveal className="tule-reveal max-w-2xl">
            <p className="text-[9px] font-extrabold uppercase tracking-[.32em] text-[#C5A46D]">Guest links</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-[#F5F0E6] sm:text-5xl">Rooms, menu and <span className="italic text-[#C5A46D]">table orders.</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#F5F0E6]/65">Open the room listings, browse the restaurant menu, or visit the table-ordering page.</p>
          </div>
          <div data-reveal className="tule-reveal flex flex-wrap gap-3">
            <Link href="/guest/rooms" className="tule-btn-shimmer inline-flex items-center gap-2 rounded-full bg-[#C5A46D] px-5 py-3.5 text-[10px] font-black uppercase tracking-[.13em] text-[#163D32] transition duration-300 hover:-translate-y-0.5 hover:bg-[#B8955E] hover:shadow-[0_8px_24px_rgba(197,164,109,.2)] active:scale-95">Plan your stay <ArrowUpRight className="h-4 w-4" /></Link>
            <Link href="/guest/table/tule-tbl-01-lakeview" className="tule-btn-shimmer inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#0F2D24]/60 px-5 py-3.5 text-[10px] font-bold uppercase tracking-[.13em] text-[#F5F0E6] transition duration-300 hover:-translate-y-0.5 hover:border-[#C5A46D] hover:bg-[#0F2D24] active:scale-95"><QrCode className="h-4 w-4 text-[#C5A46D]" /> Table QR order</Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER — Deep Forest Green ─── */}
      <footer className="bg-[#0F2D24] px-4 py-9 sm:px-7 lg:px-10 border-t border-[#163D32]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tule-resort-logo.png" alt="Tule Resort" className="h-11 w-11 rounded-xl object-contain bg-black/30 border border-white/10" />
            <span><span className="block font-display text-xl text-[#F5F0E6]">Tule Resort</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[.26em] text-[#C5A46D]">Hawassa · Ethiopia</span></span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-[.13em] text-[#F5F0E6]/60">
            <Link href="/guest/rooms" className="hover:text-[#C5A46D]">Rooms</Link>
            <Link href="/guest/restaurant" className="hover:text-[#C5A46D]">Dining</Link>
            <Link href="/guest/services" className="hover:text-[#C5A46D]">Experiences</Link>
            <Link href="/staff/login" className="hover:text-[#C5A46D]">Staff portal</Link>
          </div>
          <div className="flex flex-col gap-2 text-[10px] text-[#F5F0E6]/55 sm:items-end">
            <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#C5A46D]" /> Lake Hawassa Shore, Sidama, Ethiopia</span>
            <a href="tel:+251994781422" className="inline-flex items-center gap-2 transition hover:text-[#F5F0E6]"><Phone className="h-3.5 w-3.5 text-[#C5A46D]" /> +251 994 781 422</a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1440px] border-t border-white/10 pt-5 text-[9px] uppercase tracking-[.16em] text-[#F5F0E6]/40">© {new Date().getFullYear()} Tule Resort · Hawassa, Ethiopia · All rights reserved</div>
      </footer>
    </main>
  );
}
