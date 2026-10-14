'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  UtensilsCrossed,
  QrCode,
  ArrowRight,
  Sparkles,
  MapPin,
  Phone,
  Lock
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { tuleCopy, TuleLanguage } from '@/lib/tuleBrand';

export default function Home() {
  const [language, setLanguage] = useState<TuleLanguage>('en');
  const copy = tuleCopy[language];

  useEffect(() => {
    const onChange = (event: Event) =>
      setLanguage((event as CustomEvent<TuleLanguage>).detail);
    window.addEventListener('tule-language-change', onChange);
    return () => window.removeEventListener('tule-language-change', onChange);
  }, []);

  return (
    <main className="h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-screen overflow-hidden relative flex flex-col justify-between bg-background text-foreground select-none">
      {/* ─── 1. CINEMATIC FULL-SCREEN BACKGROUND ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2000&q=85)',
        }}
      />

      {/* Luxury Twilight Vignette & Teal-Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/85 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(21,154,156,0.25),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.15),transparent_40%)] pointer-events-none" />

      {/* ─── 2. TOP HEADER NAVIGATION ─── */}
      <header className="relative z-30 w-full px-4 py-3 sm:px-8 sm:py-4 flex items-center justify-between border-b border-border backdrop-blur-md bg-background/20 shrink-0">
        {/* Left: Brand Identity with Official Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-11 w-14 sm:h-12 sm:w-16 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tule-resort-mark.svg"
              alt="Tule Resort Logo"
              className="h-full w-full object-contain drop-shadow-md"
            />
          </div>
          <div>
            <span className="block text-sm sm:text-lg font-black tracking-tight text-foreground font-serif leading-none">
              Tule Resort
            </span>
            <span className="block text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[.25em] text-gold mt-0.5">
              Hawassa • Lake Luxury
            </span>
          </div>
        </Link>

        {/* Center: Quick Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-muted">
          <Link href="/guest/rooms" className="hover:text-primary transition-colors">
            {copy.exploreRooms}
          </Link>
          <Link href="/guest/restaurant" className="hover:text-primary transition-colors">
            {copy.dining}
          </Link>
          <Link href="/guest/table/tule-tbl-01-lakeview" className="hover:text-primary transition-colors">
            Table QR Order
          </Link>
          <Link href="/guest/services" className="hover:text-primary transition-colors">
            {copy.experiences}
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />

          <Link
            href="/staff/login"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-foreground hover:bg-surface-hover transition-all backdrop-blur-md"
          >
            <Lock className="h-3 w-3 text-gold" />
            Staff POS
          </Link>

          <Link
            href="/guest/rooms"
            className="rounded-full bg-gradient-to-r from-gold to-gold-light hover:brightness-110 px-4 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-gold/30 transition-all"
          >
            {copy.book}
          </Link>
        </div>
      </header>

      {/* ─── 3. CENTER HERO DISPLAY (ONE SCREEN - NO SCROLL) ─── */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 flex-1 flex flex-col justify-center py-2 sm:py-4 min-h-0">
        <div className="max-w-3xl space-y-2 sm:space-y-3 animate-fade-in-up">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-[.22em] text-gold-light backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-gold" />
            Hawassa Lakeside Sanctuary • Sidama, Ethiopia
          </div>

          {/* Grand Headline */}
          <h1 className="text-3xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground font-serif leading-[1.04]">
            Where the Lake <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-secondary">
              Meets Luxury.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-muted max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-none">
            {language === 'am'
              ? 'በሀይቁ ዳርቻ ውብ እረፍት፣ የኢትዮጵያ ጣዕም ያለው ምግብ፣ እና የዘመናዊ ጠረጴዛ QR አገልግሎት በአንድ ላይ።'
              : 'Panoramic shoreline villas, authentic Ethiopian gastronomy, tranquil lake breezes, and instant mobile table service.'}
          </p>
        </div>

        {/* ─── 3 ACTION PORTALS (Responsive Grid - Fits Screen) ─── */}
        <div className="mt-5 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4 max-w-4xl">
          {/* Portal 1: Rooms */}
          <Link
            href="/guest/rooms"
            className="group cel-card p-3 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-secondary/20 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <BedDouble className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-3 text-xs sm:text-base font-black text-foreground group-hover:text-gold-light transition-colors truncate">
                Lake Suites
              </h3>
              <p className="hidden sm:block mt-1 text-xs text-muted line-clamp-2">
                12 luxury rooms, private lake terraces, and king suites.
              </p>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-gold group-hover:text-gold-light">
              <span className="truncate">Explore Stays</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>

          {/* Portal 2: Dining */}
          <Link
            href="/guest/restaurant"
            className="group cel-card p-3 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-secondary/20 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-3 text-xs sm:text-base font-black text-foreground group-hover:text-gold-light transition-colors truncate">
                Lakeside Dining
              </h3>
              <p className="hidden sm:block mt-1 text-xs text-muted line-clamp-2">
                Culinary specialties, fresh Lake Tilapia, and fine drinks.
              </p>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-gold group-hover:text-gold-light">
              <span className="truncate">View Menu</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>

          {/* Portal 3: Table QR Ordering */}
          <Link
            href="/guest/table/tule-tbl-01-lakeview"
            className="group cel-card p-3 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-primary/20 text-gold-light flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="mt-2 sm:mt-3 text-xs sm:text-base font-black text-foreground group-hover:text-gold-light transition-colors truncate">
                Table QR Order
              </h3>
              <p className="hidden sm:block mt-1 text-xs text-muted line-clamp-2">
                Order food &amp; drinks directly from your terrace table.
              </p>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-gold group-hover:text-gold-light">
              <span className="truncate">Order Table</span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 4. BOTTOM STATUS BAR FOOTER (FIXED - NO SCROLL) ─── */}
      <footer className="relative z-30 w-full px-4 py-2.5 sm:px-8 sm:py-3.5 border-t border-border backdrop-blur-md bg-background/30 text-[10px] sm:text-xs text-muted flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="h-3 w-3 text-gold shrink-0" />
          <span className="truncate">Lake Hawassa Shore, Sidama, Ethiopia</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:flex items-center gap-1">
            <Phone className="h-3 w-3 text-secondary" />
            Concierge: <strong className="text-foreground">+251 994 781 422</strong>
          </span>
          <Link href="/staff/login" className="text-gold hover:text-gold-light font-bold transition-colors">
            Staff Portal →
          </Link>
        </div>
      </footer>
    </main>
  );
}
