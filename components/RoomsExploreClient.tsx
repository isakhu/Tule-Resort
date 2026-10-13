'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  Wifi,
  Wind,
  UtensilsCrossed,
  ShieldCheck,
  Tv,
  Sparkles,
  Search,
  Compass,
  Check,
  ArrowRight,
  Phone,
  MapPin,
  Calendar,
  SlidersHorizontal,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import RoomCard, { type RoomCardData } from './RoomCard';

interface RoomsExploreClientProps {
  initialRooms: RoomCardData[];
}

const CATEGORIES = [
  { id: 'all', label: 'All Accommodations', labelAm: 'ሁሉም ክፍሎች' },
  { id: 'lake', label: 'Lake Hawassa View', labelAm: 'የሐይቅ እይታ' },
  { id: 'garden', label: 'Garden & Pool View', labelAm: 'የአትክልት እና ገንዳ እይታ' },
  { id: 'suites', label: 'Luxury Suites', labelAm: 'ስዊት ክፍሎች' },
  { id: 'apartments', label: 'Serviced Apartments', labelAm: 'አፓርታማዎች' },
  { id: 'family', label: 'Family Stays', labelAm: 'የቤተሰብ ክፍሎች' },
];

export default function RoomsExploreClient({ initialRooms }: RoomsExploreClientProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'size'>('featured');

  const filteredRooms = useMemo(() => {
    let result = [...initialRooms];

    // Category filter
    if (activeCategory === 'lake') {
      result = result.filter(
        (r) =>
          r.view?.toLowerCase().includes('lake') ||
          r.name.toLowerCase().includes('lake') ||
          r.description.toLowerCase().includes('lake')
      );
    } else if (activeCategory === 'garden') {
      result = result.filter(
        (r) =>
          r.view?.toLowerCase().includes('garden') ||
          r.view?.toLowerCase().includes('pool') ||
          r.name.toLowerCase().includes('garden') ||
          r.name.toLowerCase().includes('pool')
      );
    } else if (activeCategory === 'suites') {
      result = result.filter(
        (r) =>
          r.type?.toLowerCase().includes('suite') ||
          r.name.toLowerCase().includes('suite')
      );
    } else if (activeCategory === 'apartments') {
      result = result.filter(
        (r) =>
          r.type?.toLowerCase().includes('apartment') ||
          r.name.toLowerCase().includes('apartment')
      );
    } else if (activeCategory === 'family') {
      result = result.filter(
        (r) =>
          r.type?.toLowerCase().includes('family') ||
          r.name.toLowerCase().includes('family') ||
          (r.maxOccupancy && r.maxOccupancy >= 4)
      );
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.nameAm && r.nameAm.includes(q)) ||
          r.description.toLowerCase().includes(q) ||
          r.amenities?.some((a) => a.toLowerCase().includes(q)) ||
          r.bedType?.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'size') {
      result.sort((a, b) => (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0));
    }

    return result;
  }, [initialRooms, activeCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#070A0F] text-[#ECEFF1] antialiased selection:bg-[#D4AF37] selection:text-[#070A0F]">
      {/* ========================================================================= */}
      {/* 1. HERO POSTER SECTION (Matching the Horizon Stay Luxury Poster Aesthetic) */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden border-b border-[#C5A059]/20 bg-gradient-to-b from-[#0A0E15] via-[#101722] to-[#070A0F]">
        {/* Ambient lighting spots */}
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-[#C5A059]/10 blur-[130px] pointer-events-none" />

        {/* Top Gold Bookmark Banner (Exact design from the reference poster) */}
        <div className="absolute right-6 sm:right-12 top-0 z-20 flex flex-col items-center">
          <div className="relative flex flex-col items-center bg-gradient-to-b from-[#DFB76C] via-[#C5A059] to-[#9E7A32] px-4 sm:px-6 pt-5 pb-7 text-center shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
            {/* Bed Outline Icon inside gold badge */}
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[#0B0F15]/40 bg-[#0B0F15]/10">
              <BedDouble className="h-5 w-5 sm:h-6 sm:w-6 text-[#0B0F15] stroke-[2.2]" />
            </div>
            <p className="mt-2.5 text-[9px] sm:text-[10px] font-black tracking-widest text-[#0B0F15] uppercase leading-tight max-w-[90px]">
              YOUR COMFORT IS OUR PRIORITY
            </p>
            {/* Notch Cutout for Bookmark Ribbon Tail */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#0A0E15] [clip-path:polygon(0%_100%,_50%_0%,_100%_100%)]" />
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-8 pb-14 sm:px-6 md:pt-12 md:pb-20">
          {/* Top Brand & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Geometric Monogram */}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C5A059]/40 bg-[#16202E]/70 shadow-inner">
                <span className="font-serif text-lg font-black tracking-wider text-[#F5E2B3]">TL</span>
              </div>
              <div>
                <span className="block text-xs font-black uppercase tracking-[.28em] text-[#DFB76C]">
                  TULE RESORT & SPA
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  LAKE HAWASSA · ETHIOPIA
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/guest"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-[#C5A059]/40 hover:text-[#F5E2B3]"
              >
                ← Guest Services
              </Link>
              <Link
                href="/guest/restaurant"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A059]/30 bg-[#16202E]/80 px-4 py-2 text-xs font-bold text-[#F5E2B3] transition hover:bg-[#D4AF37] hover:text-[#070A0F]"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" /> Lakeside Dining
              </Link>
            </div>
          </div>

          {/* Hero Typography: "STAY BEYOND Ordinary" */}
          <div className="mt-12 sm:mt-16 max-w-4xl">
            <h1 className="font-serif leading-[0.92] tracking-tight">
              <span className="block text-5xl sm:text-7xl md:text-8xl font-black text-white uppercase tracking-tight">
                STAY
              </span>
              <span className="block text-5xl sm:text-7xl md:text-8xl font-black bg-gradient-to-r from-[#DFB76C] via-[#F5E2B3] to-[#C5A059] bg-clip-text text-transparent uppercase tracking-tight mt-1">
                BEYOND
              </span>
              <span className="block text-4xl sm:text-6xl md:text-7xl font-serif italic font-normal text-[#F5E2B3] -mt-2 sm:-mt-4">
                Ordinary.
              </span>
            </h1>

            <p className="mt-6 text-xs sm:text-sm md:text-base font-bold uppercase tracking-[.25em] text-slate-300 max-w-xl">
              MODERN ROOMS. TIMELESS COMFORT. MEMORABLE STAYS.
            </p>
            <p className="mt-2 text-xs font-serif text-[#DFB76C]/90 tracking-wider">
              ዘመናዊ ክፍሎች · ዘመን የማይሽረው ምቾት · በሐዋሳ ሐይቅ ዳርቻ የማይረሳ ቆይታ
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 2. ROOM FEATURES STRIP (6 Circular Gold Outline Icons)                    */}
          {/* ========================================================================= */}
          <div className="mt-14 sm:mt-18 pt-8 border-t border-[#C5A059]/20">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#C5A059]/60" />
              <span className="text-[11px] font-black uppercase tracking-[.3em] text-[#DFB76C]">
                ROOM FEATURES
              </span>
              <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#C5A059]/60" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
              {[
                { label: 'PREMIUM ROOMS', icon: BedDouble },
                { label: 'FREE WIFI', icon: Wifi },
                { label: 'AIR CONDITIONER', icon: Wind },
                { label: '24/7 ROOM SERVICE', icon: UtensilsCrossed },
                { label: 'SECURED PARKING', icon: ShieldCheck },
                { label: 'SMART TV', icon: Tv },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.label}
                    className="flex flex-col items-center text-center p-3 rounded-2xl bg-[#121924]/40 border border-[#C5A059]/15 transition duration-300 hover:border-[#D4AF37]/50 hover:bg-[#16202E]/60"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#C5A059]/60 bg-[#0A0F16] text-[#DFB76C] shadow-inner">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="mt-3 text-[10px] font-black tracking-wider text-slate-300 uppercase">
                      {feat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. HIGHLIGHT BOX: RELAX. REFRESH. RECHARGE. + PERFECT STAY FOR           */}
          {/* ========================================================================= */}
          <div className="mt-10 overflow-hidden rounded-3xl border border-[#C5A059]/40 bg-gradient-to-r from-[#121924] via-[#16202E] to-[#121924] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Left headline */}
              <div className="border-b lg:border-b-0 lg:border-r border-[#C5A059]/20 pb-4 lg:pb-0 lg:pr-10">
                <h3 className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                  RELAX.
                  <br />
                  <span className="text-[#DFB76C]">REFRESH.</span>
                  <br />
                  RECHARGE.
                </h3>
                <p className="mt-2 text-xs text-slate-400 max-w-xs font-medium">
                  Immerse in uninterrupted Lake Hawassa breezes, panoramic sunsets, and warm Ethiopian hospitality.
                </p>
              </div>

              {/* Middle checklist */}
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-[.25em] text-[#DFB76C]">
                  PERFECT STAY FOR
                </p>
                <div className="mt-3 grid sm:grid-cols-3 gap-3">
                  {[
                    'Business Travelers',
                    'Families & Couples',
                    'Long Term Guests'
                  ].map((target) => (
                    <div key={target} className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D4AF37] bg-[#D4AF37]/20 text-[#DFB76C]">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">{target}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right botanical illustration (SVG line art) */}
              <div className="hidden lg:flex items-center justify-center opacity-80">
                <svg width="80" height="90" viewBox="0 0 100 120" fill="none" stroke="#DFB76C" strokeWidth="1.5">
                  <path d="M50 110 C50 60 50 30 50 10" />
                  <path d="M50 30 C30 20 25 35 50 45" />
                  <path d="M50 45 C70 35 75 50 50 60" />
                  <path d="M50 60 C30 50 25 65 50 75" />
                  <path d="M50 75 C70 65 75 80 50 90" />
                  <path d="M50 90 C30 80 25 95 50 105" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE CATEGORY TABS, SEARCH & LIVE SORT CONTROLS                */}
      {/* ========================================================================= */}
      <section className="sticky top-0 z-30 border-b border-[#C5A059]/20 bg-[#0A0E15]/95 backdrop-blur-md px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-[#DFB76C] via-[#C5A059] to-[#A88239] text-[#0A0F16] shadow-md shadow-[#D4AF37]/20 font-black'
                        : 'border border-[#C5A059]/20 bg-[#121924]/60 text-slate-300 hover:border-[#C5A059]/40 hover:text-white'
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search and Sort controls */}
            <div className="flex items-center gap-2.5">
              {/* Search box */}
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rooms, amenities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#C5A059]/25 bg-[#121924] pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => { const value = e.target.value; if (value === 'featured' || value === 'price-asc' || value === 'price-desc' || value === 'size') setSortBy(value); }}
                  className="rounded-full border border-[#C5A059]/25 bg-[#121924] px-4 py-2 text-xs font-bold text-slate-200 outline-none focus:border-[#D4AF37] cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="size">Size: Largest First</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 12 ROOM CARDS GRID                                                    */}
      {/* ========================================================================= */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        {/* Results count label */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Showing <span className="text-[#DFB76C] font-black">{filteredRooms.length}</span> luxury rooms & suites
          </p>
          {(activeCategory !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-[#DFB76C] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredRooms.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#C5A059]/25 bg-[#121924] p-12 text-center">
            <Compass className="mx-auto h-12 w-12 text-[#DFB76C]/60" />
            <h3 className="mt-4 text-xl font-bold text-white">No rooms match your search</h3>
            <p className="mt-2 text-sm text-slate-400">
              Try adjusting your search query or reset your view filter to explore all 12 rooms.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="mt-6 rounded-full bg-gradient-to-r from-[#DFB76C] to-[#C5A059] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#0A0F16]"
            >
              Show All Accommodations
            </button>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 6. BOTTOM CONTACT & CONCIERGE INFORMATION (Matching Poster Footer)        */}
      {/* ========================================================================= */}
      <footer className="border-t border-[#C5A059]/20 bg-[#0A0E15] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-xs font-black uppercase tracking-[.25em] text-[#DFB76C]">
                TULE RESORT & SPA
              </span>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Hawassa&apos;s premier lakefront destination offering five-star comfort, lush garden walkways, and executive lakeside living.
              </p>
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-[.25em] text-[#DFB76C]">
                LOCATION
              </span>
              <div className="mt-3 flex items-start gap-2.5 text-xs text-slate-300">
                <MapPin className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Main Shoreline Boulevard, Lake Hawassa, Sidama Region, Ethiopia</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-[.25em] text-[#DFB76C]">
                RESERVATIONS & DESK
              </span>
              <div className="mt-3 flex items-center gap-2.5 text-xs text-slate-300">
                <Phone className="h-4 w-4 text-[#D4AF37] shrink-0" />
                <span>+251 911 234 567 · 24/7 Concierge</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-[.25em] text-[#DFB76C]">
                GUEST PRIVILEGES
              </span>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Complimentary Full Breakfast, Swimming Pool, High-Speed Wi-Fi & Secured Parking included with every room reservation.
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-[#C5A059]/15 pt-6 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} Tule Resort & Spa · All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
