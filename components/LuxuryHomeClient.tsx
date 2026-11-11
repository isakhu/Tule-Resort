'use client';

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { isOptimizableImageSrc } from '@/lib/imageSrc';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Fish,
  Globe,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  Menu,
  Phone,
  QrCode,
  Sparkles,
  Sun,
  Users,
  UtensilsCrossed,
  Waves,
  X,
  Coffee,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { tuleBrand, tuleCopy, type TuleLanguage } from '@/lib/tuleBrand';
import type { Room } from '@/data/rooms';
import type { ResortService } from '@/data/resort-services';
import type { MenuItem } from '@/lib/menu';
import type { GalleryItem } from '@/lib/gallery';

interface LuxuryHomeClientProps {
  initialRooms: Room[];
  initialServices: ResortService[];
  initialMenuItems: MenuItem[];
  initialGalleryItems: GalleryItem[];
  defaultTableToken?: string | null;
}

function readLanguagePreference(): TuleLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    return window.localStorage.getItem('tule-language') === 'am' ? 'am' : 'en';
  } catch {
    return 'en';
  }
}

function subscribeLanguagePreference(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('tule-language-change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('tule-language-change', handler);
    window.removeEventListener('storage', handler);
  };
}

export default function LuxuryHomeClient({
  initialRooms,
  initialServices,
  initialMenuItems,
  initialGalleryItems,
  defaultTableToken,
}: LuxuryHomeClientProps) {
  const tableQrHref = defaultTableToken
    ? `/guest/table/${encodeURIComponent(defaultTableToken)}`
    : '/guest/table';
  // ─── State Management ───
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const language = useSyncExternalStore(
    subscribeLanguagePreference,
    readLanguagePreference,
    (): TuleLanguage => 'en',
  );
  const copy = tuleCopy[language];
  const craftedSuiteCount = useMemo(
    () =>
      initialRooms.filter((room) => {
        const searchable = `${room.type ?? ''} ${room.name} ${room.slug}`.toLowerCase();
        return searchable.includes('suite') || searchable.includes('deluxe');
      }).length,
    [initialRooms],
  );

  // Quick reservation bar state
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [guests, setGuests] = useState('2');
  const [roomType, setRoomType] = useState('all');

  // Room tab filter
  const [roomFilter, setRoomFilter] = useState<'all' | 'lake' | 'garden' | 'suite'>('all');

  // Gallery filter & Lightbox
  const [galleryFilter, setGalleryFilter] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Story modal state
  const [activeStory, setActiveStory] = useState<number | null>(null);

  // Banner full-view lightbox, hero choreography, and non-intrusive welcome pop-up
  const [heroReady, setHeroReady] = useState(false);
  const [bannerLightboxOpen, setBannerLightboxOpen] = useState(false);
  const [welcomePopupVisible, setWelcomePopupVisible] = useState(false);

  const dismissWelcomePopup = useCallback(() => {
    setWelcomePopupVisible(false);
    try {
      window.sessionStorage.setItem('tule_welcome_dismissed', '1');
    } catch {
      // Ignore storage errors in restricted browsing contexts
    }
  }, []);

  // ─── Scroll & Animation Observers ───
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Sync hero pop-up entrance with SplashScreen exit
    const win = window as Window & { __tuleSplashDone?: boolean };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let heroFallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let rafId: number | undefined;

    const triggerHeroReady = () => setHeroReady(true);

    if (win.__tuleSplashDone || reduceMotion) {
      rafId = window.requestAnimationFrame(triggerHeroReady);
    } else {
      window.addEventListener('tule-splash-exit', triggerHeroReady, { once: true });
      heroFallbackTimer = setTimeout(triggerHeroReady, 2050);
    }

    // Scroll reveal observer
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    let observer: IntersectionObserver | undefined;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      elements.forEach((el) => observer?.observe(el));
    }

    return () => {
      observer?.disconnect();
      if (heroFallbackTimer) clearTimeout(heroFallbackTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('tule-splash-exit', triggerHeroReady);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Trigger non-blocking welcome privilege pop-up once per session after hero enters
  useEffect(() => {
    if (!heroReady) return;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem('tule_welcome_dismissed') === '1';
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const timer = setTimeout(() => {
      setWelcomePopupVisible(true);
    }, 3200);

    return () => clearTimeout(timer);
  }, [heroReady]);

  // ─── Keyboard Listeners for Lightboxes & Modals ───
  const filteredGallery = useMemo(() => {
    if (galleryFilter === 'All') return initialGalleryItems;
    return initialGalleryItems.filter(
      (item) => item.category.toLowerCase() === galleryFilter.toLowerCase()
    );
  }, [galleryFilter, initialGalleryItems]);

  const handleNextPhoto = useCallback(() => {
    if (lightboxIndex === null || filteredGallery.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % filteredGallery.length);
  }, [lightboxIndex, filteredGallery.length]);

  const handlePrevPhoto = useCallback(() => {
    if (lightboxIndex === null || filteredGallery.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + filteredGallery.length) % filteredGallery.length);
  }, [lightboxIndex, filteredGallery.length]);

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  useEffect(() => {
    if (lightboxIndex === null && activeStory === null && !bannerLightboxOpen && !mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseLightbox();
        setActiveStory(null);
        setBannerLightboxOpen(false);
        setMobileMenuOpen(false);
      }
      if (lightboxIndex !== null) {
        if (e.key === 'ArrowRight') handleNextPhoto();
        if (e.key === 'ArrowLeft') handlePrevPhoto();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex, activeStory, bannerLightboxOpen, mobileMenuOpen, handleCloseLightbox, handleNextPhoto, handlePrevPhoto]);

  // ─── Filtered Rooms ───
  const filteredRooms = useMemo(() => {
    if (roomFilter === 'all') return initialRooms;
    if (roomFilter === 'lake') {
      return initialRooms.filter(
        (r) =>
          r.view?.toLowerCase().includes('lake') ||
          r.name.toLowerCase().includes('lake') ||
          r.slug.toLowerCase().includes('lake')
      );
    }
    if (roomFilter === 'garden') {
      return initialRooms.filter(
        (r) =>
          r.view?.toLowerCase().includes('garden') ||
          r.name.toLowerCase().includes('garden') ||
          r.slug.toLowerCase().includes('garden')
      );
    }
    if (roomFilter === 'suite') {
      return initialRooms.filter(
        (r) =>
          r.type?.toLowerCase().includes('suite') ||
          r.name.toLowerCase().includes('suite') ||
          r.slug.toLowerCase().includes('suite') ||
          r.type?.toLowerCase().includes('deluxe')
      );
    }
    return initialRooms;
  }, [roomFilter, initialRooms]);

  // Spotlight Suite (prefer available suites matching active filter)
  const spotlightRoom = useMemo(() => {
    const activePool =
      filteredRooms.filter((r) => r.isAvailable !== false).length > 0
        ? filteredRooms.filter((r) => r.isAvailable !== false)
        : initialRooms.filter((r) => r.isAvailable !== false);
    const pool = activePool.length > 0 ? activePool : filteredRooms;
    return (
      pool.find(
        (r) =>
          r.slug.includes('deluxe-one-bedroom-suite') ||
          r.slug.includes('executive-lakefront-villa') ||
          r.name.toLowerCase().includes('deluxe one-bedroom')
      ) || pool[0]
    );
  }, [filteredRooms, initialRooms]);

  const companionRooms = useMemo(() => {
    return filteredRooms.filter((r) => r.id !== spotlightRoom?.id).slice(0, 3);
  }, [filteredRooms, spotlightRoom]);

  // Curated Stories
  const stories = useMemo(
    () => [
      {
        id: 1,
        title: 'The Dawn Ritual of Lake Hawassa',
        category: 'Resort Life',
        readTime: '3 min read',
        image:
          'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85',
        excerpt:
          'As the first morning sun crests over the Rift Valley ridges, the lake surface awakens with gentle mist and the soothing calls of endemic kingfishers.',
        content:
          'Each morning at Tule Resort starts on the lakeside terrace. Before the city stirs, our coffee master begins the sacred Sidama roasting ritual over open coals. The scent of green coffee beans caramelizing into dark roast mingles with fragrant frankincense, welcoming guests to sip the world’s finest heirloom coffee while watching fishermen paddle past in carved wooden canoes.',
      },
      {
        id: 2,
        title: 'The Artisanal Fishermen of Hawassa',
        category: 'Local Heritage',
        readTime: '4 min read',
        image:
          'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=85',
        excerpt:
          'Generations of Hawassa fishermen continue the sustainable tradition of morning net casting, delivering the freshest Tilapia straight to our kitchen.',
        content:
          'Lake Hawassa is renowned across Ethiopia for its bountiful, sweet freshwater fish. Tule Resort partners directly with local artisanal fishermen who dock at our pier shortly after sunrise. Our chefs select prime Tilapia within hours of catch, preparing it according to traditional Ethiopian spice rubs or delicate Mediterranean pan-sears with garden herbs.',
      },
      {
        id: 3,
        title: 'Lakeside Evenings & Starlit Banquets',
        category: 'Weddings & Celebrations',
        readTime: '3 min read',
        image:
          'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85',
        excerpt:
          'Under the canopy of Southern Ethiopian stars, private boardwalk dinners and grand celebrations become lifelong memories.',
        content:
          'Whether celebrating a milestone wedding anniversary, gathering the family for an intimate holiday, or hosting an executive summit, Tule Resort’s open-air lakefront venues provide an unforgettable backdrop. Lanterns line the boardwalk pier, acoustic melodies float across the water, and our culinary team curates personalized multi-course banquets.',
      },
    ],
    []
  );

  return (
    <div className="relative min-h-screen bg-[#F5F0E6] text-[#26312D] selection:bg-[#C5A46D] selection:text-[#163D32]">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 01 — PREMIUM NAVIGATION
          ═══════════════════════════════════════════════════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
            ? 'bg-[#163D32]/95 backdrop-blur-xl border-b border-[#C5A46D]/25 shadow-[0_10px_35px_rgba(0,0,0,0.25)] py-3'
            : 'bg-gradient-to-b from-[#163D32]/85 via-[#163D32]/40 to-transparent border-b border-white/10 py-4 sm:py-5'
          }`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
          {/* Brand Logo & Title */}
          <Link
            href="/"
            aria-label="Tule Resort home"
            className="group flex shrink-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#C5A46D]/40 bg-[#0F2D24]/80 transition-transform duration-500 group-hover:scale-105 sm:h-12 sm:w-12 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              <Image
                src="/tule-resort-logo.png"
                alt="Tule Resort"
                width={48}
                height={48}
                priority
                className="h-full w-full object-contain p-1 drop-shadow-[0_2px_8px_rgba(197,164,109,.3)]"
              />
            </span>
            <div>
              <span className="block font-display text-lg font-medium tracking-wide sm:text-2xl text-[#F5F0E6]">
                Tule Resort
              </span>
              <span className="block text-[8px] font-black uppercase tracking-[.28em] text-[#C5A46D] sm:text-[9px]">
                Hawassa · Ethiopia
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 xl:gap-8 text-[11px] font-bold uppercase tracking-[.18em] text-[#F5F0E6]/80 lg:flex"
          >
            <a href="#about" className="transition-colors hover:text-[#C5A46D]">
              {copy.navAbout}
            </a>
            <a href="#accommodations" className="transition-colors hover:text-[#C5A46D]">
              {copy.navAccommodation}
            </a>
            <a href="#experiences" className="transition-colors hover:text-[#C5A46D]">
              {copy.navExperiences}
            </a>
            <a href="#lake-hawassa" className="transition-colors hover:text-[#C5A46D]">
              {copy.navLake}
            </a>
            <a href="#dining" className="transition-colors hover:text-[#C5A46D]">
              {copy.navDining}
            </a>
            <a href="#gallery" className="transition-colors hover:text-[#C5A46D]">
              {copy.navGallery}
            </a>
            <a href="#contact" className="transition-colors hover:text-[#C5A46D]">
              {copy.navContact}
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3.5">
            <LanguageSwitcher />

            <Link
              href="/staff/login"
              className="hidden items-center gap-1.5 rounded-full border border-[#C5A46D]/30 bg-[#163D32]/60 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[#F5F0E6]/85 backdrop-blur-md transition hover:border-[#C5A46D] hover:text-[#C5A46D] md:inline-flex"
            >
              <Lock className="h-3 w-3 text-[#C5A46D]" /> Staff
            </Link>

            <Link
              href="/guest/booking"
              className="group inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#C5A46D] px-0 py-2.5 text-[10px] font-black uppercase tracking-[.15em] text-[#163D32] shadow-[0_4px_20px_rgba(197,164,109,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#B8955E] hover:shadow-[0_8px_25px_rgba(197,164,109,.4)] sm:h-auto sm:w-auto sm:px-6 sm:gap-2"
            >
              <span className="hidden sm:inline">{copy.book}</span>
              <span className="sr-only sm:hidden">{copy.book}</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-black/20 text-[#F5F0E6] lg:hidden hover:bg-black/40 transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-[#C5A46D]" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Navigation Drawer ─── */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-[#163D32]/98 backdrop-blur-2xl px-5 sm:px-6 pt-24 pb-[calc(2rem+env(safe-area-inset-bottom))] text-[#F5F0E6] lg:hidden animate-fade-in-up"
        >
          <div className="flex flex-col gap-6 text-sm font-bold uppercase tracking-[.2em] border-b border-[#C5A46D]/20 pb-8">
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center text-[#F5F0E6]/90 hover:text-[#C5A46D] transition"
            >
              About Tule Resort
            </a>
            <a
              href="#accommodations"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#F5F0E6]/90 hover:text-[#C5A46D] transition"
            >
              Accommodations &amp; Suites
            </a>
            <a
              href="#experiences"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#F5F0E6]/90 hover:text-[#C5A46D] transition"
            >
              Resort Experiences
            </a>
            <a
              href="#lake-hawassa"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#F5F0E6]/90 hover:text-[#C5A46D] transition"
            >
              Discover Lake Hawassa
            </a>
            <a
              href="#dining"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#F5F0E6]/90 hover:text-[#C5A46D] transition"
            >
              Dining &amp; Hospitality
            </a>
            <a
              href="#gallery"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#F5F0E6]/90 hover:text-[#C5A46D] transition"
            >
              Photo Gallery
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#F5F0E6]/90 hover:text-[#C5A46D] transition"
            >
              Contact &amp; Location
            </a>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <Link
              href="/guest/booking"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#C5A46D] py-4 text-xs font-black uppercase tracking-[.18em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20"
            >
              Book Your Stay <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/guest/rooms"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#C5A46D]/40 bg-[#0F2D24]/70 py-3.5 text-xs font-bold uppercase tracking-[.16em] text-[#F5F0E6]"
            >
              Browse All Suites
            </Link>

            <Link
              href="/staff/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/20 py-3 text-xs font-bold uppercase tracking-[.16em] text-[#F5F0E6]/85 hover:border-[#C5A46D]/50 hover:text-[#C5A46D] transition"
            >
              <Lock className="h-3.5 w-3.5 text-[#C5A46D]" /> Staff Portal Login
            </Link>

            <div className="mt-4 flex items-center justify-between text-xs text-[#F5F0E6]/60 border-t border-white/10 pt-4">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#C5A46D]" /> Hawassa, Ethiopia
              </span>
              <a href="tel:+251994781422" className="flex items-center gap-1.5 text-[#C5A46D]">
                <Phone className="h-3.5 w-3.5" /> +251 994 781 422
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 02 — CINEMATIC HERO EXPERIENCE
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative isolate flex min-h-screen flex-col justify-between overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-14 lg:pt-36">
        {/* Genuine Background Image with Parallax Drift */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-30 bg-cover bg-center bg-no-repeat transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: "url('/tule-resort-hawassa-hero.jpg')",
          }}
        />

        {/* Dual Directional Dark Overlays for Optimal Text Readability */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(22,61,50,.92)_0%,rgba(22,61,50,.72)_48%,rgba(22,61,50,.35)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[linear-gradient(0deg,#163D32_0%,rgba(22,61,50,.2)_35%,rgba(22,61,50,.15)_70%,rgba(22,61,50,.65)_100%)]"
        />
        <div
          aria-hidden="true"
          className="tule-ambient-glow pointer-events-none absolute -right-36 top-16 -z-10 h-[36rem] w-[36rem] rounded-full"
        />

        {/* Topographic Contour Lines Motif */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-16 z-0 h-[500px] w-[500px] opacity-[0.14] text-[#C5A46D]"
          viewBox="0 0 500 500"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="250" cy="250" r="230" strokeWidth="0.8" strokeDasharray="3 4" />
          <path d="M70,250 C120,200 180,210 230,170 C280,130 330,150 430,180" strokeWidth="1" />
          <path d="M50,280 C110,230 170,240 220,200 C270,160 340,190 450,220" strokeWidth="0.8" />
          <path d="M90,320 C140,270 200,280 250,240 C300,200 360,230 430,260" strokeWidth="1.2" />
          <text x="250" y="275" fontSize="8" letterSpacing="3" fill="currentColor" stroke="none">
            LAKE HAWASSA · 1,685M
          </text>
          <text x="250" y="290" fontSize="7" letterSpacing="2" fill="currentColor" opacity="0.7" stroke="none">
            7°03′N · 38°28′E
          </text>
        </svg>

        {/* Hero Narrative & Reservation Grid */}
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12 my-auto py-6 sm:py-10">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,.85fr)] xl:gap-16">
            {/* Left Column: Grand Tule Resort Banner */}
            <div className="max-w-3xl">
              {/* Eyebrow Label with Coordinates */}
              <div
                className={`inline-flex flex-wrap items-center gap-2.5 rounded-full border border-[#C5A46D]/40 bg-[#163D32]/85 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.24em] text-[#F5F0E6] shadow-lg backdrop-blur-md transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  heroReady ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
                }`}
              >
                <span className="flex h-2 w-2 rounded-full bg-[#C5A46D] shadow-[0_0_8px_#C5A46D] animate-pulse" />
                <MapPin className="h-3 w-3 text-[#C5A46D]" />
                <span className="text-[#C5A46D]">Hawassa · Ethiopia</span>
                <span className="h-3 w-px bg-[#C5A46D]/30" />
                <span>7°03′N 38°28′E</span>
                <span className="hidden sm:inline h-3 w-px bg-[#C5A46D]/30" />
                <span className="hidden sm:inline text-[#F5F0E6]/80">Lakefront Sanctuary</span>
              </div>

              {/* MAIN HERO BANNER — TULE RESORT (Spring Pop-Up + Click-to-Expand Modal) */}
              <button
                type="button"
                onClick={() => setBannerLightboxOpen(true)}
                aria-label="View Tule Resort main banner in full screen"
                className={`tule-banner-sheen mt-5 mb-5 block w-full max-w-xl text-left overflow-hidden rounded-[2.2rem] border-2 border-[#C5A46D]/60 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-md group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A46D] transition-all duration-[850ms] delay-100 ease-[cubic-bezier(0.22,1.22,0.36,1)] ${
                  heroReady ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.91]'
                }`}
              >
                <Image
                  src="/tule-resort-main-banner.jpg"
                  alt="Tule Resort — Hawassa, Ethiopia Main Banner"
                  width={1024}
                  height={682}
                  sizes="(max-width: 768px) 100vw, 576px"
                  priority
                  className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32]/35 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 pointer-events-none rounded-[2.2rem]" />
                <span className="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-full border border-[#C5A46D]/40 bg-[#163D32]/85 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#F5F0E6] opacity-0 translate-y-1 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  <Maximize2 className="h-3 w-3 text-[#C5A46D]" /> Expand
                </span>
              </button>

              {/* Sub-headline & Editorial Copy */}
              <div
                className={`transition-all duration-700 delay-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                <div className="mt-2 flex items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A46D]/70" />
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-[.36em] text-[#C5A46D]">
                    {copy.homeEyebrow}
                  </p>
                </div>

                {/* Editorial Headline */}
                <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-light text-[#F5F0E6] leading-tight">
                  {copy.heroHeadlineStart} <span className="italic font-normal text-[#C5A46D]">{copy.heroHeadlineAccent}</span>
                </h1>

                {/* Short Emotional Description */}
                <p className="mt-3.5 max-w-2xl text-sm leading-relaxed text-[#F5F0E6]/85 sm:text-base font-sans">
                  {copy.homeDescription}
                </p>
              </div>

              {/* Action Buttons */}
              <div
                className={`mt-8 flex flex-wrap items-center gap-3.5 sm:mt-9 transition-all duration-700 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                <a
                  href="#accommodations"
                  className="tule-btn-shimmer group inline-flex items-center gap-3 rounded-full bg-[#C5A46D] px-7 py-4 text-[11px] font-black uppercase tracking-[.15em] text-[#163D32] shadow-[0_10px_35px_rgba(197,164,109,.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#B8955E] hover:shadow-[0_15px_45px_rgba(197,164,109,.4)] active:scale-95"
                >
                  {copy.discoverRooms}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>

                <Link
                  href="/guest/booking"
                  className="inline-flex items-center gap-2.5 rounded-full border border-[#C5A46D]/50 bg-[#163D32]/70 px-7 py-4 text-[11px] font-bold uppercase tracking-[.15em] text-[#F5F0E6] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C5A46D] hover:bg-[#163D32] active:scale-95"
                >
                  {copy.book}
                </Link>

                <Link
                  href="/guest/restaurant"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-5 py-4 text-[11px] font-bold uppercase tracking-[.14em] text-[#F5F0E6]/80 backdrop-blur-md transition hover:text-white hover:border-white/40"
                >
                  <UtensilsCrossed className="h-4 w-4 text-[#C5A46D]" /> {copy.diningMenu}
                </Link>
              </div>

              {/* Metadata Strip */}
              <div
                className={`mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#C5A46D]/20 pt-5 text-[9px] font-bold uppercase tracking-[.18em] text-[#F5F0E6]/65 sm:mt-10 sm:pt-6 transition-all duration-700 delay-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <span className="inline-flex items-center gap-2 text-[#F5F0E6]">
                  <MapPin className="h-3.5 w-3.5 text-[#C5A46D]" /> Lake Hawassa Shore, Sidama, Ethiopia
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-[#C5A46D] sm:block" />
                <span className="text-[#C5A46D]">Elevation 1,685m</span>
                <span className="hidden h-1 w-1 rounded-full bg-[#C5A46D] sm:block" />
                <span className="text-[#C5A46D]">{copy.homeTagline}</span>
              </div>
            </div>

            {/* Right Column: Direct Reservations Card (Spring Pop-Up Entrance) */}
            <div
              className={`relative mx-auto w-full max-w-[460px] lg:max-w-none transition-all duration-[850ms] delay-200 ease-[cubic-bezier(0.22,1.18,0.36,1)] ${
                heroReady ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.93]'
              }`}
            >
              <div className="rounded-[2.4rem] border border-[#C5A46D]/35 bg-[#163D32]/92 p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-[#C5A46D]/20 pb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[.24em] text-[#C5A46D]">Direct Reservations</span>
                    <h3 className="font-display text-2xl sm:text-3xl text-[#F5F0E6] leading-tight mt-0.5">Plan Your Stay</h3>
                  </div>
                  <span className="rounded-full bg-[#0F2D24] border border-[#C5A46D]/40 px-3.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                    Best Rate
                  </span>
                </div>

                <div className="mt-5 space-y-3.5">
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
                        <option value="4" className="bg-[#163D32]">4+ Family / Group</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0F2D24]/80 p-2.5">
                      <label className="text-[8px] font-bold uppercase tracking-[.18em] text-[#C5A46D] flex items-center gap-1">
                        <BedDouble className="h-3 w-3" /> Suite Category
                      </label>
                      <select
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value)}
                        className="mt-1 w-full bg-transparent text-xs font-semibold text-[#F5F0E6] outline-none"
                      >
                        <option value="all" className="bg-[#163D32]">All Suites &amp; Rooms</option>
                        <option value="lake" className="bg-[#163D32]">Lake Hawassa View</option>
                        <option value="garden" className="bg-[#163D32]">Garden Retreats</option>
                        <option value="suites" className="bg-[#163D32]">Luxury Deluxe Suites</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Resort Highlights */}
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-[#F5F0E6]/85 pt-1">
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <Sun className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>24°C Lake Breeze</span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>Buffet Breakfast</span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <Waves className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>Heated Pool Access</span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-[#0F2D24]/60 border border-[#C5A46D]/20 p-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                      <span>Private Pier Open</span>
                    </span>
                  </div>

                  <Link
                    href={`/guest/rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}${
                      roomType !== 'all' ? `&type=${roomType}` : ''
                    }`}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A46D] py-3.5 text-xs font-black uppercase tracking-[.15em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20 hover:bg-[#B8955E] transition duration-200 active:scale-95"
                  >
                    <span>Check Availability &amp; Rates</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Subtle Scroll Down Indicator */}
          <div className="mt-8 sm:mt-12 flex justify-center">
            <a
              href="#about"
              className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.26em] text-[#F5F0E6]/70 hover:text-white transition"
            >
              <span>Scroll to Explore</span>
              <ArrowDown className="h-3.5 w-3.5 text-[#C5A46D] animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 03 — INTRODUCING TULE RESORT
          ═══════════════════════════════════════════════════════════════ */}
      <section id="about" className="relative z-10 bg-[#F5F0E6] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-center">
            {/* Left Column: Editorial Storytelling */}
            <div data-reveal className="tule-reveal lg:col-span-6 xl:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#163D32]/8 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#163D32]">
                <Compass className="h-3 w-3 text-[#C5A46D]" /> Ethiopian Lakeside Hospitality
              </div>

              <h2 className="mt-5 font-display text-4xl font-light leading-[1.04] tracking-tight text-[#26312D] sm:text-5xl lg:text-6xl">
                A DIFFERENT WAY TO <br />
                <span className="italic font-normal text-[#C5A46D]">EXPERIENCE HAWASSA.</span>
              </h2>

              <p className="mt-6 text-base leading-relaxed text-[#26312D]/80 sm:text-lg">
                Nestled along the sheltered southern shores of Lake Hawassa in Ethiopia’s Great Rift
                Valley, Tule Resort is a sanctuary where tranquil waters, lush indigenous flora, and
                genuine Ethiopian hospitality create an unforgettable retreat.
              </p>

              <p className="mt-4 text-sm leading-relaxed text-[#26312D]/70 sm:text-base">
                Whether greeting the morning mist with freshly roasted Sidama coffee on your private
                terrace, taking an afternoon boat excursion from our private pier, or savoring fresh
                lake catch as the sun sets behind the hills, every moment is crafted with unhurried
                elegance and personalized attention.
              </p>

              {/* 3 Pillar Highlights */}
              <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#163D32]/10 bg-white p-4 shadow-sm">
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                    Shoreline
                  </span>
                  <p className="mt-1 font-display text-xl font-medium text-[#163D32]">Private Boardwalk Pier</p>
                  <p className="mt-1 text-xs text-[#26312D]/60">Direct access to Lake Hawassa waters</p>
                </div>

                <div className="rounded-2xl border border-[#163D32]/10 bg-white p-4 shadow-sm">
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                    Sanctuary
                  </span>
                  <p className="mt-1 font-display text-xl font-medium text-[#163D32]">{craftedSuiteCount > 0 ? `${craftedSuiteCount} Crafted ${craftedSuiteCount === 1 ? 'Suite' : 'Suites'}` : 'Discover Our Stays'}</p>
                  <p className="mt-1 text-xs text-[#26312D]/60">Handmade timber &amp; volcanic stone</p>
                </div>

                <div className="rounded-2xl border border-[#163D32]/10 bg-white p-4 shadow-sm">
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                    Heritage
                  </span>
                  <p className="mt-1 font-display text-xl font-medium text-[#163D32]">Sidama Coffee</p>
                  <p className="mt-1 text-xs text-[#26312D]/60">Daily traditional dawn ceremony</p>
                </div>
              </div>

              {/* Discover More Link */}
              <div className="mt-8 sm:mt-10">
                <Link
                  href="/guest/services"
                  className="group inline-flex items-center gap-3 rounded-full bg-[#163D32] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[.18em] text-[#F5F0E6] shadow-md transition duration-300 hover:bg-[#0F2D24] hover:shadow-xl active:scale-95"
                >
                  <span>Discover More About Tule Resort</span>
                  <ArrowRight className="h-4 w-4 text-[#C5A46D] transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Right Column: Framed Resort Photography */}
            <div data-reveal className="tule-reveal lg:col-span-6 xl:col-span-5">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Decorative border frame */}
                <div className="absolute -inset-3 rounded-[2.5rem] border-2 border-[#C5A46D]/30 -z-10 transform rotate-1 hidden sm:block" />

                <div className="relative overflow-hidden rounded-[2.2rem] shadow-[0_25px_60px_rgba(22,61,50,0.15)] bg-[#163D32] aspect-[4/5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tule-hero-visual.jpg"
                    alt="Tule Resort lakeside grounds and pool"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#163D32]/90 via-[#163D32]/20 to-transparent" />

                  {/* Floating Caption Badge */}
                  <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-[#163D32]/90 border border-[#C5A46D]/30 backdrop-blur-xl text-[#F5F0E6]">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-[#C5A46D]">
                      <span>Lakeside Sanctuary</span>
                      <span>Elevation 1,685m</span>
                    </div>
                    <p className="mt-1 font-display text-2xl font-light text-[#F5F0E6]">
                      Where Nature Meets Rift Valley Elegance
                    </p>
                    <p className="mt-1 text-xs text-[#F5F0E6]/70">
                      Lake Hawassa Shoreline, Sidama Region, Ethiopia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 04 — ACCOMMODATION (Kempinski-Inspired)
          ═══════════════════════════════════════════════════════════════ */}
      <section id="accommodations" className="relative z-10 bg-[#EDE8DC] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32 border-y border-[#163D32]/10">
        <div className="mx-auto max-w-[1440px]">
          {/* Section Header */}
          <div data-reveal className="tule-reveal mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#163D32]/8 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#163D32]">
                <BedDouble className="h-3 w-3 text-[#C5A46D]" /> Refined Sanctuaries
              </div>
              <h2 className="mt-4 font-display text-4xl font-light leading-[1.0] tracking-tight text-[#26312D] sm:text-5xl lg:text-6xl">
                YOUR PLACE TO <span className="italic font-normal text-[#C5A46D]">UNWIND.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#26312D]/75 sm:text-base">
                Each suite is thoughtfully appointed with handcrafted natural woods, panoramic lake or
                garden verandas, and peaceful Rift Valley breezes.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRoomFilter('all')}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${roomFilter === 'all'
                    ? 'bg-[#163D32] text-[#F5F0E6] shadow-md'
                    : 'bg-white border border-[#163D32]/15 text-[#26312D]/70 hover:bg-white/80'
                  }`}
              >
                All Suites ({initialRooms.length})
              </button>
              <button
                onClick={() => setRoomFilter('lake')}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${roomFilter === 'lake'
                    ? 'bg-[#163D32] text-[#F5F0E6] shadow-md'
                    : 'bg-white border border-[#163D32]/15 text-[#26312D]/70 hover:bg-white/80'
                  }`}
              >
                Lake View
              </button>
              <button
                onClick={() => setRoomFilter('garden')}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${roomFilter === 'garden'
                    ? 'bg-[#163D32] text-[#F5F0E6] shadow-md'
                    : 'bg-white border border-[#163D32]/15 text-[#26312D]/70 hover:bg-white/80'
                  }`}
              >
                Garden Retreats
              </button>
              <button
                onClick={() => setRoomFilter('suite')}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${roomFilter === 'suite'
                    ? 'bg-[#163D32] text-[#F5F0E6] shadow-md'
                    : 'bg-white border border-[#163D32]/15 text-[#26312D]/70 hover:bg-white/80'
                  }`}
              >
                Luxury Deluxe
              </button>
            </div>
          </div>

          {/* Accommodations Editorial Showcase */}
          <div className="grid gap-8 lg:grid-cols-12 items-stretch">
            {/* Spotlight Premier Suite (Span 7) */}
            {spotlightRoom && (
              <article
                data-reveal
                className="tule-reveal group relative flex flex-col justify-end overflow-hidden rounded-[2.5rem] border border-[#163D32]/15 bg-white shadow-[0_24px_60px_rgba(22,61,50,0.1)] lg:col-span-7 min-h-[580px] lg:min-h-[660px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spotlightRoom.imageUrl}
                  alt={spotlightRoom.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/65 to-black/15" />

                <div className="absolute left-6 right-6 top-6 flex items-center justify-between z-10">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A46D]/50 bg-[#163D32]/85 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.22em] text-[#C5A46D] backdrop-blur-md shadow-md">
                    <Sparkles className="h-3 w-3" /> Premier Spotlight
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/85 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available
                  </span>
                </div>

                <div className="relative z-10 p-6 sm:p-9 lg:p-11">
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#C5A46D]">
                    <span>{spotlightRoom.view || 'Panoramic Lake Hawassa View'}</span>
                    <span>•</span>
                    <span>{spotlightRoom.bedType || '1 King Bed'}</span>
                    {spotlightRoom.sizeSqm && (
                      <>
                        <span>•</span>
                        <span>{spotlightRoom.sizeSqm} m²</span>
                      </>
                    )}
                  </div>

                  <h3 className="mt-2 font-display text-3xl font-medium text-[#F5F0E6] sm:text-4xl lg:text-5xl">
                    {spotlightRoom.name}
                  </h3>

                  <p className="mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-[#F5F0E6]/85 line-clamp-3">
                    {spotlightRoom.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold text-[#F5F0E6]/90">
                    {spotlightRoom.amenities?.slice(0, 4).map((amenity, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-[#163D32]/85 border border-white/10 px-3 py-1"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[#C5A46D]/25 pt-5">
                    <div>
                      <span className="block text-[8px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                        Verified Direct Rate
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display text-2xl sm:text-3xl font-bold text-[#F5F0E6]">
                          {spotlightRoom.price.toLocaleString()} ETB
                        </span>
                        <span className="text-xs text-[#F5F0E6]/60">/ night</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/guest/rooms/${encodeURIComponent(spotlightRoom.slug)}`}
                        className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#F5F0E6] transition hover:bg-white/20"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/guest/rooms/${encodeURIComponent(spotlightRoom.slug)}/book`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#C5A46D] px-5 py-2.5 text-[10px] font-black uppercase tracking-[.15em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20 hover:bg-[#B8955E] transition active:scale-95"
                      >
                        Book Suite <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Companion Rooms Column (Span 5) */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {companionRooms.map((room, idx) => (
                <article
                  key={room.id}
                  data-reveal
                  className="tule-reveal group relative flex flex-col justify-end overflow-hidden rounded-[2.2rem] border border-[#163D32]/10 bg-white shadow-[0_16px_40px_rgba(22,61,50,0.06)] flex-1 min-h-[300px]"
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/65 to-black/10" />

                  <div className="absolute left-5 right-5 top-5 flex items-center justify-between z-10">
                    <span className="rounded-full border border-[#C5A46D]/40 bg-[#163D32]/85 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-[#C5A46D] backdrop-blur-md">
                      {room.view || room.type}
                    </span>
                    <span className="rounded bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase text-white/90 backdrop-blur-md">
                      {room.bedType || 'Comfort Bed'}
                    </span>
                  </div>

                  <div className="relative z-10 p-5 sm:p-6">
                    <h4 className="font-display text-2xl font-medium text-[#F5F0E6] sm:text-3xl">
                      {room.name}
                    </h4>
                    <p className="mt-1 text-xs text-[#F5F0E6]/80 line-clamp-2">
                      {room.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-[#C5A46D]/20 pt-3">
                      <div>
                        <span className="font-display text-xl font-bold text-[#F5F0E6]">
                          {room.price.toLocaleString()} ETB
                        </span>
                        <span className="text-[10px] text-[#F5F0E6]/60"> / night</span>
                      </div>
                      <Link
                        href={`/guest/rooms/${encodeURIComponent(room.slug)}/book`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#C5A46D] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-[#163D32] transition hover:bg-[#B8955E] active:scale-95"
                      >
                        Book <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* View All Rooms Footer Link */}
          <div className="mt-12 text-center">
            <Link
              href="/guest/rooms"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#163D32] hover:text-[#C5A46D] transition group"
            >
              <span>Explore All {initialRooms.length} Suites &amp; Accommodations</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5 text-[#C5A46D]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 05 — THE TULE EXPERIENCE
          ═══════════════════════════════════════════════════════════════ */}
      <section id="experiences" className="relative z-10 bg-[#163D32] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32 text-[#F5F0E6]">
        <div aria-hidden="true" className="tule-ambient-glow pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[45rem] w-[45rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />

        <div className="mx-auto max-w-[1440px]">
          {/* Header */}
          <div data-reveal className="tule-reveal mb-14 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#0F2D24]/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#C5A46D]">
              <Sparkles className="h-3 w-3" /> Curated Moments
            </div>
            <h2 className="mt-4 font-display text-4xl font-light leading-[1.0] tracking-tight sm:text-5xl lg:text-6xl text-[#F5F0E6]">
              MORE THAN A STAY.<br />
              <span className="italic font-normal text-[#C5A46D]">AN EXPERIENCE TO REMEMBER.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#F5F0E6]/75 sm:text-base">
              From rejuvenating wellness and lakeside swimming to authentic cuisine and sunset boat
              cruises, discover experiences designed to inspire.
            </p>
          </div>

          {/* Experience Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {initialServices.slice(0, 6).map((service, idx) => (
              <article
                key={service.id}
                data-reveal
                className="tule-reveal group relative min-h-[420px] overflow-hidden rounded-[2.2rem] border border-[#C5A46D]/20 bg-[#0F2D24] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col justify-end"
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-80 group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/60 to-transparent" />

                <div className="absolute left-6 right-6 top-6 flex items-center justify-between z-10">
                  <span className="rounded-full border border-[#C5A46D]/40 bg-[#163D32]/85 px-3 py-1 text-[8px] font-extrabold uppercase tracking-widest text-[#C5A46D] backdrop-blur-md">
                    {service.eyebrow}
                  </span>
                  <span className="font-display text-xl italic text-[#C5A46D]">0{idx + 1}</span>
                </div>

                <div className="relative z-10 p-6 sm:p-7">
                  <h3 className="font-display text-2xl font-medium text-[#F5F0E6] sm:text-3xl">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#F5F0E6]/80 line-clamp-2">
                    {service.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5 text-[9px] font-semibold text-[#F5F0E6]/80">
                    {service.features.slice(0, 3).map((f, i) => (
                      <span key={i} className="rounded bg-[#163D32]/85 border border-white/10 px-2 py-0.5">
                        {f}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-[#C5A46D]/20 pt-4 flex items-center justify-between">
                    <Link
                      href={
                        service.id === 'rooms'
                          ? '/guest/rooms'
                          : service.id === 'restaurant'
                          ? '/guest/restaurant'
                          : service.id === 'cafeteria'
                          ? '/guest/cafeteria'
                          : service.id === 'pool-passes' || service.id === 'tule-aqua'
                          ? '/guest/tule-aqua'
                          : service.id === 'experiences'
                          ? '/guest/services'
                          : `/guest/${encodeURIComponent(service.id)}`
                      }
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-[#C5A46D] group-hover:text-white transition"
                    >
                      <span>Explore Experience</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Cinematic Drone Video Showcase */}
          <div data-reveal className="tule-reveal mt-16 overflow-hidden rounded-[2.5rem] border border-[#C5A46D]/30 bg-[#0F2D24] shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
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
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#163D32]/90 via-transparent to-black/20" />

              <div className="absolute bottom-6 left-6 right-6 sm:bottom-9 sm:left-9 sm:right-9 flex items-end justify-between pointer-events-none">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#163D32]/85 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#C5A46D] backdrop-blur-md border border-[#C5A46D]/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C5A46D] animate-pulse" /> Live Resort Footage
                  </span>
                  <p className="mt-2 font-display text-2xl sm:text-3xl text-[#F5F0E6]">
                    Atmosphere on Lake Hawassa
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#F5F0E6]/70">
                    Lakeside Pool · Private Pier · Sunset Terrace
                  </p>
                </div>

                <Link
                  href="/guest/rooms"
                  className="pointer-events-auto hidden sm:inline-flex items-center gap-2 rounded-full bg-[#C5A46D] px-6 py-3.5 text-[10px] font-black uppercase tracking-[.14em] text-[#163D32] shadow-lg shadow-[#C5A46D]/20 hover:bg-[#B8955E] transition"
                >
                  Book Stay <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 06 — DISCOVER LAKE HAWASSA (Sense of Place)
          ═══════════════════════════════════════════════════════════════ */}
      <section id="lake-hawassa" className="relative z-10 bg-[#EDE8DC] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-center">
            {/* Left: Panoramic Destination Visual */}
            <div data-reveal className="tule-reveal lg:col-span-6">
              <div className="relative overflow-hidden rounded-[2.5rem] shadow-[0_24px_60px_rgba(22,61,50,0.12)] border border-[#163D32]/10 aspect-[4/3] bg-[#163D32]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85"
                  alt="Lake Hawassa landscape at sunrise"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32]/85 via-transparent to-black/15" />

                <div className="absolute bottom-6 left-6 right-6 text-[#F5F0E6]">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                    Great Rift Valley · Ethiopia
                  </span>
                  <p className="mt-1 font-display text-2xl font-light">
                    Lake Hawassa Shoreline at Sunrise
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Editorial Narrative */}
            <div data-reveal className="tule-reveal lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#163D32]/8 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#163D32]">
                <Globe className="h-3 w-3 text-[#C5A46D]" /> The Destination
              </div>

              <h2 className="mt-4 font-display text-4xl font-light leading-[1.02] tracking-tight text-[#26312D] sm:text-5xl lg:text-6xl">
                WHERE NATURE <br />
                <span className="italic font-normal text-[#C5A46D]">SETS THE PACE.</span>
              </h2>

              <p className="mt-5 text-base leading-relaxed text-[#26312D]/80 sm:text-lg">
                Lake Hawassa is one of Ethiopia’s most captivating natural treasures. Cradled within
                an ancient volcanic caldera, its freshwater shores teem with endemic birdlife, marabou
                storks, and white pelicans.
              </p>

              <p className="mt-3 text-sm leading-relaxed text-[#26312D]/70 sm:text-base">
                Here, time slows to the rhythm of gentle waves, fishermen gliding in traditional boats
                at dawn, and golden Rift Valley sunsets that paint the water in amber and rose. Tule
                Resort is your front-row seat to this extraordinary destination.
              </p>

              {/* 3 Destination Pillars */}
              <div className="mt-6 space-y-3.5">
                <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 border border-[#163D32]/10 shadow-sm">
                  <Sun className="h-5 w-5 text-[#C5A46D] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#163D32]">Caldera Sanctuary &amp; Mild Climate</h4>
                    <p className="mt-0.5 text-xs text-[#26312D]/70">
                      Located at 1,685m elevation with year-round mild tropical temperatures averaging 24°C.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 border border-[#163D32]/10 shadow-sm">
                  <Waves className="h-5 w-5 text-[#C5A46D] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#163D32]">Birdwatcher&apos;s Haven</h4>
                    <p className="mt-0.5 text-xs text-[#26312D]/70">
                      Home to over 300 bird species including African fish eagles, kingfishers, and pelicans.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 border border-[#163D32]/10 shadow-sm">
                  <Coffee className="h-5 w-5 text-[#C5A46D] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#163D32]">Sidama Culture &amp; Coffee Origins</h4>
                    <p className="mt-0.5 text-xs text-[#26312D]/70">
                      Rich cultural heritage and the birthplace of world-renowned Sidama single-origin coffee.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/guest/services"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#C5A46D] hover:text-[#163D32] transition group"
                >
                  <span>Explore Destination Experiences</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 07 — DINING AND HOSPITALITY
          ═══════════════════════════════════════════════════════════════ */}
      <section id="dining" className="relative z-10 bg-[#F5F0E6] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32 border-b border-[#163D32]/10">
        <div className="mx-auto max-w-[1440px]">
          {/* Header */}
          <div data-reveal className="tule-reveal mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#163D32]/8 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#163D32]">
                <UtensilsCrossed className="h-3 w-3 text-[#C5A46D]" /> Culinary Journeys
              </div>
              <h2 className="mt-4 font-display text-4xl font-light leading-[1.0] tracking-tight text-[#26312D] sm:text-5xl lg:text-6xl">
                A TASTE OF <span className="italic font-normal text-[#C5A46D]">EXCEPTIONAL HOSPITALITY.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#26312D]/75 sm:text-base">
                Indulge in a celebration of flavors—from freshly caught Lake Hawassa Tilapia and
                slow-simmered Ethiopian classics to international favorites and artisanal Rift Valley
                coffee.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/guest/restaurant"
                className="inline-flex items-center gap-2 rounded-full bg-[#163D32] px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6] shadow-md hover:bg-[#0F2D24] transition"
              >
                View Full Menu <ArrowRight className="h-3.5 w-3.5 text-[#C5A46D]" />
              </Link>
              <Link
                href={tableQrHref}
                className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-[#163D32] hover:bg-[#EDE8DC] transition"
              >
                <QrCode className="h-3.5 w-3.5 text-[#C5A46D]" /> Table QR Order
              </Link>
            </div>
          </div>

          {/* 3 Signature Culinary Concepts */}
          <div className="grid gap-6 md:grid-cols-3">
            <div data-reveal className="tule-reveal rounded-[2rem] border border-[#163D32]/10 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163D32]/10 text-[#163D32] mb-5">
                <Fish className="h-6 w-6 text-[#163D32]" />
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                Lake Catch
              </span>
              <h3 className="mt-1 font-display text-2xl font-medium text-[#163D32]">
                Lake Hawassa Tilapia
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#26312D]/70">
                Fresh morning catch prepared grilled with local herbs, crisp-fried with lime butter, or
                tenderly steamed in banana leaf wrapping.
              </p>
            </div>

            <div data-reveal className="tule-reveal rounded-[2rem] border border-[#163D32]/10 bg-white p-7 shadow-sm" style={{ transitionDelay: '100ms' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163D32]/10 text-[#163D32] mb-5">
                <UtensilsCrossed className="h-6 w-6 text-[#163D32]" />
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                Ethiopian Heritage
              </span>
              <h3 className="mt-1 font-display text-2xl font-medium text-[#163D32]">
                Traditional Feasts
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#26312D]/70">
                Rich Doro Wot, sizzling tender beef Tibs, and an elaborate vegetarian beyaynetu spread
                served on artisanal teff Injera.
              </p>
            </div>

            <div data-reveal className="tule-reveal rounded-[2rem] border border-[#163D32]/10 bg-white p-7 shadow-sm" style={{ transitionDelay: '200ms' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163D32]/10 text-[#163D32] mb-5">
                <Coffee className="h-6 w-6 text-[#163D32]" />
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#C5A46D]">
                Artisanal Ritual
              </span>
              <h3 className="mt-1 font-display text-2xl font-medium text-[#163D32]">
                Sidama Coffee Ceremony
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#26312D]/70">
                Green heirloom beans roasted over fragrant frankincense coals and poured in triple
                infusions according to Sidama tradition.
              </p>
            </div>
          </div>

          {/* Sample Menu Items Preview from Database */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {initialMenuItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                data-reveal
                className="tule-reveal group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#163D32]/10 bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <div>
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#163D32]/10 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-2 right-2 rounded-full bg-[#163D32]/85 px-2.5 py-0.5 text-[8px] font-bold uppercase text-[#C5A46D] backdrop-blur-md">
                      {item.category}
                    </span>
                  </div>

                  <h4 className="font-display text-lg font-bold text-[#163D32] line-clamp-1">
                    {item.name}
                  </h4>
                  <p className="mt-1 text-xs text-[#26312D]/60 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#163D32]/10 pt-3">
                  <span className="font-display text-lg font-bold text-[#163D32]">
                    {item.price.toLocaleString()} ETB
                  </span>
                  <Link
                    href="/guest/restaurant"
                    className="text-[9px] font-black uppercase tracking-wider text-[#C5A46D] hover:text-[#163D32] transition"
                  >
                    Details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 08 — STORIES AND SPECIAL EXPERIENCES
          ═══════════════════════════════════════════════════════════════ */}
      <section id="stories" className="relative z-10 bg-[#EDE8DC] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          {/* Header */}
          <div data-reveal className="tule-reveal mb-14 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#163D32]/8 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#163D32]">
              <Sparkles className="h-3 w-3 text-[#C5A46D]" /> Lakeside Chronicles
            </div>
            <h2 className="mt-4 font-display text-4xl font-light leading-[1.0] tracking-tight text-[#26312D] sm:text-5xl lg:text-6xl">
              MOMENTS AT <span className="italic font-normal text-[#C5A46D]">TULE RESORT.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#26312D]/75 sm:text-base">
              Quiet reflections, authentic encounters, and unforgettable celebrations recorded on the
              shores of Lake Hawassa.
            </p>
          </div>

          {/* Stories Cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {stories.map((story, i) => (
              <article
                key={story.id}
                data-reveal
                className="tule-reveal group flex flex-col overflow-hidden rounded-[2.2rem] border border-[#163D32]/10 bg-white shadow-sm hover:shadow-xl transition-all duration-300"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#163D32]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.image}
                    alt={story.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#163D32]/85 border border-[#C5A46D]/30 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-[#C5A46D] backdrop-blur-md">
                    {story.category}
                  </span>
                </div>

                <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#8A9B83]">
                      {story.readTime}
                    </span>
                    <h3 className="mt-2 font-display text-2xl font-medium text-[#163D32] group-hover:text-[#C5A46D] transition">
                      {story.title}
                    </h3>
                    <p className="mt-3 text-xs leading-relaxed text-[#26312D]/70">
                      {story.excerpt}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveStory(story.id)}
                    className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#163D32] hover:text-[#C5A46D] transition"
                  >
                    <span>Read Full Story</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Story Full Modal */}
          {activeStory !== null && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Resort story"
              onClick={() => setActiveStory(null)}
              className="tule-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="tule-modal-pop relative max-w-2xl rounded-[2.5rem] bg-[#F5F0E6] p-7 sm:p-10 text-[#26312D] shadow-2xl border border-[#C5A46D]/30 max-h-[90vh] overflow-y-auto"
              >
                <button
                  type="button"
                  aria-label="Close story"
                  onClick={() => setActiveStory(null)}
                  className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#163D32] text-white hover:bg-[#0F2D24] transition"
                >
                  <X className="h-5 w-5" />
                </button>

                {(() => {
                  const s = stories.find((item) => item.id === activeStory);
                  if (!s) return null;
                  return (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#C5A46D]">
                        {s.category} · {s.readTime}
                      </span>
                      <h3 className="mt-2 font-display text-3xl sm:text-4xl text-[#163D32]">
                        {s.title}
                      </h3>
                      <div className="mt-5 relative aspect-video w-full overflow-hidden rounded-2xl bg-[#163D32]">
                        <Image
                          src={s.image}
                          alt={s.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 720px"
                          unoptimized={!isOptimizableImageSrc(s.image)}
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-6 text-sm leading-relaxed text-[#26312D]/85 sm:text-base">
                        {s.content}
                      </p>
                      <div className="mt-8 border-t border-[#163D32]/10 pt-4 flex justify-end">
                        <button
                          onClick={() => setActiveStory(null)}
                          className="rounded-full bg-[#163D32] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#F5F0E6] hover:bg-[#0F2D24]"
                        >
                          Close Story
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 09 — PREMIUM PHOTO GALLERY
          ═══════════════════════════════════════════════════════════════ */}
      <section id="gallery" className="relative z-10 bg-[#F5F0E6] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          {/* Header */}
          <div data-reveal className="tule-reveal mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#163D32]/15 bg-[#163D32]/8 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#163D32]">
                <Camera className="h-3 w-3 text-[#C5A46D]" /> Visual Portfolio
              </div>
              <h2 className="mt-4 font-display text-4xl font-light leading-[1.0] tracking-tight text-[#26312D] sm:text-5xl lg:text-6xl">
                CAPTURING <span className="italic font-normal text-[#C5A46D]">TULE RESORT.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#26312D]/75 sm:text-base">
                Explore the serene architecture, expansive lake views, peaceful gardens, and
                hospitality that await your visit.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'Lakeside', 'Suites', 'Dining', 'Leisure'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGalleryFilter(cat)}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${galleryFilter === cat
                      ? 'bg-[#163D32] text-[#F5F0E6] shadow-md'
                      : 'bg-white border border-[#163D32]/15 text-[#26312D]/70 hover:bg-[#EDE8DC]'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {filteredGallery.map((item, index) => (
              <button
                type="button"
                key={item.id}
                data-reveal
                onClick={() => setLightboxIndex(index)}
                aria-label={`Open gallery image: ${item.title}`}
                className="tule-reveal tule-card-interactive group relative aspect-square w-full overflow-hidden rounded-2xl bg-[#163D32] text-left cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A46D]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32]/90 via-[#163D32]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 text-[#F5F0E6]">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#C5A46D]">
                    {item.category}
                  </span>
                  <p className="font-display text-sm sm:text-base font-medium line-clamp-1">
                    {item.title}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Full Gallery Link */}
          <div className="mt-12 text-center">
            <Link
              href="/guest/gallery"
              className="group inline-flex items-center gap-3 rounded-full border border-[#163D32]/20 bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-[.18em] text-[#163D32] shadow-sm hover:bg-[#163D32] hover:text-[#F5F0E6] transition duration-300"
            >
              <span>View Full Gallery (30+ Photos)</span>
              <ArrowRight className="h-4 w-4 text-[#C5A46D] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Gallery Lightbox Modal ─── */}
      {lightboxIndex !== null && filteredGallery[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={filteredGallery[lightboxIndex].title}
          onClick={handleCloseLightbox}
          className="tule-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#163D32]/95 backdrop-blur-2xl p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseLightbox();
            }}
            aria-label="Close Lightbox"
            className="absolute top-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevPhoto();
            }}
            aria-label="Previous Photo"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNextPhoto();
            }}
            aria-label="Next Photo"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition"
          >
            <ChevronRight className="h-7 w-7" />
          </button>

          <div
            key={filteredGallery[lightboxIndex].id}
            onClick={(e) => e.stopPropagation()}
            className="tule-modal-pop relative max-h-[85vh] max-w-5xl overflow-hidden rounded-[2rem] bg-black shadow-2xl border border-[#C5A46D]/30 flex flex-col items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={filteredGallery[lightboxIndex].image_url}
              alt={filteredGallery[lightboxIndex].title}
              className="max-h-[72vh] w-auto object-contain"
            />
            <div className="w-full bg-[#163D32] p-4 sm:p-5 text-center text-[#F5F0E6]">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#C5A46D]">
                {filteredGallery[lightboxIndex].category} · Photo {lightboxIndex + 1} of{' '}
                {filteredGallery.length}
              </span>
              <h3 className="mt-1 font-display text-xl sm:text-2xl text-[#F5F0E6]">
                {filteredGallery[lightboxIndex].title}
              </h3>
              {filteredGallery[lightboxIndex].caption && (
                <p className="mt-1 text-xs text-[#F5F0E6]/75">
                  {filteredGallery[lightboxIndex].caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 10 — FINAL RESERVATION EXPERIENCE
          ═══════════════════════════════════════════════════════════════ */}
      <section id="reservation" className="relative z-10 bg-[#163D32] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32 text-[#F5F0E6] overflow-hidden">
        <div aria-hidden="true" className="tule-ambient-glow pointer-events-none absolute right-0 top-0 -z-10 h-[40rem] w-[40rem] rounded-full" />

        <div className="mx-auto max-w-[1440px]">
          <div className="rounded-[3rem] border border-[#C5A46D]/30 bg-[#0F2D24]/85 p-8 sm:p-14 lg:p-20 shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#163D32]/80 px-4 py-1.5 text-[9px] font-black uppercase tracking-[.26em] text-[#C5A46D]">
                <Sparkles className="h-3 w-3" /> Reservations &amp; Inquiries
              </span>

              <h2 className="mt-6 font-display text-4xl font-light leading-[1.0] tracking-tight sm:text-5xl lg:text-7xl text-[#F5F0E6]">
                YOUR ESCAPE TO HAWASSA <br />
                <span className="italic font-normal text-[#C5A46D]">BEGINS HERE.</span>
              </h2>

              <p className="mt-5 text-base leading-relaxed text-[#F5F0E6]/85 sm:text-lg">
                Discover Tule Resort and make your next stay an unforgettable experience. Book online
                for direct rates or contact our guest reservations team directly.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 sm:mt-10">
                <Link
                  href="/guest/booking"
                  className="group inline-flex items-center gap-3 rounded-full bg-[#C5A46D] px-8 py-4 text-xs font-black uppercase tracking-[.16em] text-[#163D32] shadow-[0_10px_35px_rgba(197,164,109,.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#B8955E] active:scale-95"
                >
                  <span>BOOK YOUR STAY</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="tel:+251994781422"
                  className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#163D32]/70 px-7 py-4 text-xs font-bold uppercase tracking-[.14em] text-[#F5F0E6] hover:bg-[#163D32] hover:border-[#C5A46D] transition active:scale-95"
                >
                  <Phone className="h-4 w-4 text-[#C5A46D]" />
                  <span>CONTACT FRONT DESK</span>
                </a>
              </div>

              {/* Direct Booking Perks Strip */}
              <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-[#C5A46D]/20 pt-8 text-left text-xs text-[#F5F0E6]/80">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C5A46D] shrink-0" />
                  <span>Best Rate Guaranteed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C5A46D] shrink-0" />
                  <span>Free Buffet Breakfast</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C5A46D] shrink-0" />
                  <span>Complimentary Wi-Fi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C5A46D] shrink-0" />
                  <span>Heated Pool Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 11 — PREMIUM FOOTER
          ═══════════════════════════════════════════════════════════════ */}
      <footer id="contact" className="relative z-10 bg-[#0F2D24] text-[#F5F0E6] border-t border-[#163D32]">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Brand Column (Span 4) */}
            <div className="lg:col-span-4">
              <Link href="/" className="inline-flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/tule-resort-logo.png"
                  alt="Tule Resort"
                  className="h-12 w-12 rounded-xl object-contain bg-black/40 border border-white/10 p-1"
                />
                <div>
                  <span className="block font-display text-2xl text-[#F5F0E6]">Tule Resort</span>
                  <span className="block text-[8px] font-black uppercase tracking-[.28em] text-[#C5A46D]">
                    Hawassa · Ethiopia
                  </span>
                </div>
              </Link>

              <p className="mt-4 font-display text-lg italic text-[#C5A46D]">
                {tuleBrand.tagline}
              </p>

              <p className="mt-3 text-xs leading-relaxed text-[#F5F0E6]/70 max-w-sm">
                A luxury lakeside sanctuary on the shores of Lake Hawassa offering refined
                accommodations, authentic Ethiopian dining, restorative wellness, and serene Rift
                Valley experiences.
              </p>

              <div className="mt-6 flex flex-col gap-2 text-xs text-[#F5F0E6]/80">
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                  {tuleBrand.address}
                </span>
                <a
                  href="tel:+251994781422"
                  className="flex items-center gap-2 hover:text-[#C5A46D] transition"
                >
                  <Phone className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                  {tuleBrand.phones.join(' / ')}
                </a>
                <a
                  href={`mailto:${tuleBrand.email}`}
                  className="flex items-center gap-2 hover:text-[#C5A46D] transition"
                >
                  <Mail className="h-3.5 w-3.5 text-[#C5A46D] shrink-0" />
                  {tuleBrand.email}
                </a>
              </div>
            </div>

            {/* Nav Column 1: Accommodations */}
            <div className="lg:col-span-2">
              <h4 className="text-[10px] font-black uppercase tracking-[.22em] text-[#C5A46D] mb-4">
                Accommodations
              </h4>
              <ul className="space-y-2.5 text-xs text-[#F5F0E6]/75">
                <li>
                  <Link href="/guest/rooms" className="hover:text-white transition">
                    All Suites &amp; Rooms
                  </Link>
                </li>
                <li>
                  <Link href="/guest/rooms?type=lake" className="hover:text-white transition">
                    Lake View Suites
                  </Link>
                </li>
                <li>
                  <Link href="/guest/rooms?type=garden" className="hover:text-white transition">
                    Garden Retreats
                  </Link>
                </li>
                <li>
                  <Link href="/guest/booking" className="hover:text-white transition">
                    Direct Booking Engine
                  </Link>
                </li>
              </ul>
            </div>

            {/* Nav Column 2: Experiences */}
            <div className="lg:col-span-2">
              <h4 className="text-[10px] font-black uppercase tracking-[.22em] text-[#C5A46D] mb-4">
                Experiences
              </h4>
              <ul className="space-y-2.5 text-xs text-[#F5F0E6]/75">
                <li>
                  <Link href="/guest/restaurant" className="hover:text-white transition">
                    Lakeside Restaurant
                  </Link>
                </li>
                <li>
                  <Link href="/guest/tule-aqua" className="hover:text-white transition">
                    Tule Aqua &amp; Pool
                  </Link>
                </li>
                <li>
                  <Link href="/guest/services" className="hover:text-white transition">
                    Spa &amp; Wellness
                  </Link>
                </li>
                <li>
                  <Link href={tableQrHref} className="hover:text-white transition">
                    Table QR Ordering
                  </Link>
                </li>
              </ul>
            </div>

            {/* Nav Column 3: Destination */}
            <div className="lg:col-span-2">
              <h4 className="text-[10px] font-black uppercase tracking-[.22em] text-[#C5A46D] mb-4">
                Destination
              </h4>
              <ul className="space-y-2.5 text-xs text-[#F5F0E6]/75">
                <li>
                  <a href="#lake-hawassa" className="hover:text-white transition">
                    Lake Hawassa Caldera
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-white transition">
                    Sidama Region
                  </a>
                </li>
                <li>
                  <Link href="/guest/gallery" className="hover:text-white transition">
                    Photo Portfolio
                  </Link>
                </li>
                <li>
                  <a href="#stories" className="hover:text-white transition">
                    Lakeside Chronicles
                  </a>
                </li>
              </ul>
            </div>

            {/* Nav Column 4: Guest & Staff Portal */}
            <div className="lg:col-span-2">
              <h4 className="text-[10px] font-black uppercase tracking-[.22em] text-[#C5A46D] mb-4">
                Portals &amp; Staff
              </h4>
              <ul className="space-y-2.5 text-xs text-[#F5F0E6]/75">
                <li>
                  <Link href="/guest" className="hover:text-white transition">
                    Guest Services Hub
                  </Link>
                </li>
                <li>
                  <Link href="/guest/my-activity" className="hover:text-white transition">
                    Guest Activity &amp; Folio
                  </Link>
                </li>
                <li>
                  <Link href="/staff/login" className="hover:text-white transition flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-[#C5A46D]" /> Staff Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Legal Strip */}
          <div className="mt-16 border-t border-white/10 pt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-[10px] uppercase tracking-[.18em] text-[#F5F0E6]/50">
            <div>
              &copy; {new Date().getFullYear()} Tule Resort. All rights reserved. Hawassa, Sidama, Ethiopia.
            </div>
            <div className="flex items-center gap-6">
              <span>Boutique Luxury Hospitality</span>
              <span>·</span>
              <a href="#about" className="hover:text-white transition">Back to Top &uarr;</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Tule Resort Main Banner Full-View Pop-Up Modal ─── */}
      {bannerLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tule Resort Main Banner"
          onClick={() => setBannerLightboxOpen(false)}
          className="tule-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#163D32]/95 backdrop-blur-2xl p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setBannerLightboxOpen(false);
            }}
            aria-label="Close Banner Preview"
            className="absolute top-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="tule-modal-pop relative max-w-4xl w-full overflow-hidden rounded-[2.2rem] bg-[#0F2D24] shadow-2xl border-2 border-[#C5A46D]/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tule-resort-main-banner.jpg"
              alt="Tule Resort — Hawassa, Ethiopia"
              className="w-full max-h-[75vh] object-cover"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#163D32] px-6 py-5 text-[#F5F0E6] border-t border-[#C5A46D]/25">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[.24em] text-[#C5A46D]">
                  Tule Resort · Lake Hawassa
                </span>
                <p className="mt-1 font-display text-2xl text-[#F5F0E6]">
                  Relax. Enjoy. Remember.
                </p>
              </div>
              <Link
                href="/guest/booking"
                onClick={() => setBannerLightboxOpen(false)}
                className="tule-btn-shimmer inline-flex items-center justify-center gap-2 rounded-full bg-[#C5A46D] px-6 py-3 text-[10px] font-black uppercase tracking-[.16em] text-[#163D32] hover:bg-[#B8955E] transition"
              >
                <span>Plan Your Stay</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Non-Blocking Floating Welcome Privilege Pop-Up ─── */}
      {welcomePopupVisible &&
        lightboxIndex === null &&
        activeStory === null &&
        !bannerLightboxOpen &&
        !mobileMenuOpen && (
          <aside
            aria-label="Direct Booking Privilege"
            className="tule-modal-pop fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[370px] z-40 rounded-[1.8rem] border border-[#C5A46D]/50 bg-[#163D32]/95 p-4 text-[#F5F0E6] shadow-[0_24px_65px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          >
            <button
              type="button"
              onClick={dismissWelcomePopup}
              aria-label="Dismiss welcome message"
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#F5F0E6]/80 hover:bg-white/20 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3.5 pr-6">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#C5A46D]/40 bg-[#0F2D24]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/tule-resort-main-banner.jpg"
                  alt="Tule Resort Welcome"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[.22em] text-[#C5A46D]">
                  <Sparkles className="h-2.5 w-2.5" /> Direct Lakeside Stay
                </span>
                <p className="mt-0.5 font-display text-lg leading-tight text-[#F5F0E6]">
                  Welcome to Tule Resort
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#F5F0E6]/75">
                  Enjoy complimentary buffet breakfast &amp; pool access on direct bookings.
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex items-center gap-2 border-t border-[#C5A46D]/20 pt-3">
              <Link
                href="/guest/booking"
                onClick={dismissWelcomePopup}
                className="tule-btn-shimmer flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#C5A46D] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.15em] text-[#163D32] hover:bg-[#B8955E] transition"
              >
                <span>Book Your Stay</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={dismissWelcomePopup}
                className="rounded-xl border border-white/15 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#F5F0E6]/75 hover:bg-white/10 hover:text-white transition"
              >
                Later
              </button>
            </div>
          </aside>
        )}
    </div>
  );
}

