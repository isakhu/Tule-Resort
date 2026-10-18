'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Compass,
  Lock,
  MapPin,
  Phone,
  QrCode,
  Sparkles,
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
    <main className="min-h-screen overflow-x-hidden bg-[#07191E] text-[#F8F5EE]">
      <header className="relative z-40 border-b border-white/10 bg-[#07191E]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-7 lg:px-10">
          <Link href="/" aria-label="Tule Resort home" className="group flex shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-11 w-12 items-center justify-center transition-transform duration-500 group-hover:scale-105 sm:h-12 sm:w-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tule-resort-mark.svg" alt="" className="h-full w-full object-contain drop-shadow-[0_4px_18px_rgba(248,215,122,.16)]" />
            </span>
            <span>
              <span className="block font-display text-xl font-semibold leading-none tracking-wide sm:text-2xl">Tule Resort</span>
              <span className="mt-1 block text-[8px] font-extrabold uppercase tracking-[.28em] text-[#D7B66A] sm:text-[9px]">Hawassa · Ethiopia</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[11px] font-bold uppercase tracking-[.15em] text-white/65 lg:flex">
            <Link href="/guest/rooms" className="transition-colors hover:text-[#F8D77A]">{copy.exploreRooms}</Link>
            <Link href="/guest/restaurant" className="transition-colors hover:text-[#F8D77A]">{copy.dining}</Link>
            <Link href="/guest/services" className="transition-colors hover:text-[#F8D77A]">{copy.experiences}</Link>
            <Link href="/guest/table/tule-tbl-01-lakeview" className="transition-colors hover:text-[#F8D77A]">Open table ordering</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link href="/staff/login" className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white/75 transition hover:border-[#D7B66A]/70 hover:text-[#F8D77A] sm:inline-flex">
              <Lock className="h-3 w-3" /> Staff
            </Link>
            <Link href="/guest/rooms" className="group inline-flex items-center gap-2 rounded-full bg-[#D7B66A] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-[#07191E] shadow-[0_8px_30px_rgba(215,182,106,.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#F8D77A] sm:px-5">
              {copy.book}<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      <section
        className="tule-hero relative isolate flex min-h-[680px] items-center overflow-hidden sm:min-h-[760px] lg:min-h-[calc(100svh-76px)]"
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
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(4,17,21,.94)_0%,rgba(4,17,21,.78)_42%,rgba(4,17,21,.2)_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(0deg,#07191E_0%,rgba(7,25,30,.18)_35%,rgba(7,25,30,.18)_75%,rgba(7,25,30,.58)_100%)]" />
        <div aria-hidden="true" className="tule-ambient-glow pointer-events-none absolute -right-44 top-12 -z-10 h-[34rem] w-[34rem] rounded-full" />

        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 px-4 pb-20 pt-20 sm:px-7 sm:pb-24 sm:pt-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:gap-8 lg:px-10 lg:py-20 xl:gap-16">
          <div className="relative z-10 max-w-3xl">
            <div className="tule-intro inline-flex items-center gap-2 rounded-full border border-[#D7B66A]/35 bg-[#07191E]/45 px-3.5 py-2 text-[9px] font-extrabold uppercase tracking-[.2em] text-[#F8D77A] backdrop-blur-md sm:text-[10px]">
              <Sparkles className="h-3.5 w-3.5" />
              Hawassa lakeside · Sidama, Ethiopia
            </div>

            <p className="tule-intro mt-8 text-[10px] font-bold uppercase tracking-[.35em] text-white/60 sm:mt-10" style={{ animationDelay: '100ms' }}>
              ROOMS · RESTAURANT · GUEST SERVICES
            </p>
            <h1 className="tule-intro mt-4 max-w-4xl font-display text-[clamp(3.5rem,8vw,7.8rem)] font-medium leading-[.84] tracking-[-.045em] text-[#FFFDF7]" style={{ animationDelay: '180ms' }}>
              View rooms in
              <br />
              <span className="tule-title-accent italic">Hawassa.</span>
            </h1>
            <p className="tule-intro mt-7 max-w-xl text-sm leading-7 text-white/75 sm:mt-8 sm:text-base sm:leading-8" style={{ animationDelay: '260ms' }}>
              View the available rooms, browse the restaurant menu, and check the guest services offered at Tule Resort in Hawassa.
            </p>

            <div className="tule-intro mt-8 flex flex-wrap items-center gap-3 sm:mt-9" style={{ animationDelay: '340ms' }}>
              <Link href="/guest/rooms" className="tule-btn-shimmer group inline-flex items-center gap-3 rounded-full bg-[#D7B66A] px-6 py-3.5 text-[10px] font-black uppercase tracking-[.14em] text-[#07191E] transition duration-300 hover:-translate-y-1 hover:bg-[#F8D77A] hover:shadow-[0_12px_38px_rgba(215,182,106,.28)] active:scale-95">
                View rooms <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/guest/services" className="tule-btn-shimmer inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[.06] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[.13em] text-white/90 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10 active:scale-95">
                <Compass className="h-3.5 w-3.5" /> Guest services
              </Link>
            </div>

            <div className="tule-intro mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/20 pt-5 text-[9px] font-bold uppercase tracking-[.16em] text-white/55 sm:mt-12 sm:pt-6" style={{ animationDelay: '420ms' }}>
              <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#D7B66A]" /> Lake Hawassa, Ethiopia</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#D7B66A] sm:block" />
              <span>Rooms · Restaurant · Guest services</span>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[490px] lg:block" aria-label="Illustrated 3D view of a resort">
            <div
              className="tule-3d-frame relative aspect-[.78] w-full"
              style={{
                transform: `rotateY(${tilt.x * 5}deg) rotateX(${tilt.y * -4}deg)`,
              }}
            >
              <div className="tule-photo-panel absolute inset-[5%_8%_11%_8%] overflow-hidden rounded-[2rem] border border-white/20 bg-[#102D33] shadow-[0_35px_100px_rgba(0,0,0,.45)]">
                <div className="tule-photo-panel-image absolute inset-0 opacity-25" />
                <TuleResortDiorama />
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#041115]/70 via-[#041115]/10 to-transparent" />
                <div className="absolute inset-x-5 top-5 z-20 flex items-start justify-between">
                  <span className="rounded-full border border-white/20 bg-black/25 px-3 py-2 text-[9px] font-bold uppercase tracking-[.18em] text-white/85 backdrop-blur-lg">3D resort illustration</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/25 text-[#F8D77A] backdrop-blur-lg"><Waves className="h-4 w-4" /></span>
                </div>
                <div className="absolute inset-x-6 bottom-7 z-20">
                  <p className="text-[9px] font-bold uppercase tracking-[.3em] text-[#F8D77A]">Tule Resort · Hawassa</p>
                  <p className="mt-2 font-display text-4xl leading-none text-white xl:text-5xl">Rooms.<br /><span className="italic">Dining.</span></p>
                  <div className="mt-5 h-px w-full bg-white/25" />
                  <div className="mt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-[.14em] text-white/65">
                    <span>Rooms · Restaurant · Services</span><ArrowUpRight className="h-4 w-4 text-[#F8D77A]" />
                  </div>
                </div>
              </div>

              <div className="tule-float-card absolute -left-1 top-[24%] z-10 rounded-2xl border border-white/20 bg-[#0B252C]/85 p-4 shadow-[0_18px_45px_rgba(0,0,0,.35)] backdrop-blur-xl xl:-left-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D7B66A]/15 text-[#F8D77A]"><BedDouble className="h-4.5 w-4.5" /></span>
                  <span><span className="block text-[9px] font-extrabold uppercase tracking-[.16em] text-white/45">01 / Rooms</span><span className="mt-1 block text-xs font-bold text-white">View room options</span></span>
                </div>
              </div>

              <div className="tule-float-card absolute -right-1 bottom-[22%] z-10 rounded-2xl border border-white/20 bg-[#0B252C]/85 p-4 shadow-[0_18px_45px_rgba(0,0,0,.35)] backdrop-blur-xl [animation-delay:-2.5s] xl:-right-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#159A9C]/15 text-[#6DE0D2]"><UtensilsCrossed className="h-4.5 w-4.5" /></span>
                  <span><span className="block text-[9px] font-extrabold uppercase tracking-[.16em] text-white/45">02 / Menu</span><span className="mt-1 block text-xs font-bold text-white">Browse the menu</span></span>
                </div>
              </div>
              <span aria-hidden="true" className="absolute -right-2 top-[12%] h-16 w-16 rounded-full border border-[#D7B66A]/30 [transform:translateZ(45px)]" />
              <span aria-hidden="true" className="absolute bottom-[8%] left-[1%] h-2.5 w-2.5 rounded-full bg-[#F8D77A] shadow-[0_0_24px_8px_rgba(248,215,122,.2)]" />
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[.26em] text-white/35">
              <span className="h-px w-8 bg-white/25" /> Rooms · Restaurant · Guest services <span className="h-px w-8 bg-white/25" />
            </div>
          </div>
        </div>

        <Link href="#experiences" className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[8px] font-bold uppercase tracking-[.25em] text-white/55 transition hover:text-white sm:bottom-7">
          See rooms and services <ArrowDown className="h-4 w-4 animate-bounce" />
        </Link>
      </section>

      <section id="experiences" className="relative z-10 bg-[#07191E] px-4 py-20 sm:px-7 sm:py-28 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div data-reveal className="tule-reveal mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[9px] font-extrabold uppercase tracking-[.32em] text-[#D7B66A] sm:text-[10px]">Explore Tule Resort</p>
              <h2 className="mt-4 font-display text-5xl font-medium leading-[.95] tracking-[-.035em] text-white sm:text-6xl lg:text-7xl">Rooms, dining and <span className="italic text-[#D7B66A]">guest services.</span></h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/55">Compare room options, open the restaurant menu, or view the services listed for resort guests.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 md:gap-4 xl:gap-6">
            {experiences.map((experience, index) => {
              const Icon = experience.icon;
              return (
                <article key={experience.number} data-reveal className="tule-reveal tule-card-interactive group relative min-h-[450px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0B252C]" style={{ transitionDelay: `${index * 100}ms` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={experience.image} alt={experience.alt} loading="lazy" className="tule-experience-image absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#041115] via-[#041115]/45 to-[#041115]/5" />
                  <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-black/25 px-3 py-2 text-[8px] font-extrabold uppercase tracking-[.2em] text-white/80 backdrop-blur-md">{experience.eyebrow}</span>
                    <span className="font-display text-2xl italic text-white/60">{experience.number}</span>
                  </div>
                  <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[#F8D77A] backdrop-blur-md"><Icon className="h-5 w-5" /></span>
                    <h3 className="max-w-sm font-display text-3xl leading-[1.02] text-white sm:text-4xl">{experience.title}</h3>
                    <p className="mt-3 max-w-sm text-xs leading-6 text-white/70 sm:text-sm">{experience.description}</p>
                    <Link href={experience.href} className="mt-5 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#F8D77A] transition-colors hover:text-white">
                      {experience.action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/10 bg-[#0B252C] px-4 py-14 sm:px-7 sm:py-18 lg:px-10 lg:py-20">
        <div aria-hidden="true" className="absolute -right-20 -top-32 h-96 w-96 rounded-full border border-[#D7B66A]/10" />
        <div aria-hidden="true" className="absolute -right-8 -top-20 h-72 w-72 rounded-full border border-[#D7B66A]/10" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div data-reveal className="tule-reveal max-w-2xl">
            <p className="text-[9px] font-extrabold uppercase tracking-[.32em] text-[#D7B66A]">Guest links</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-white sm:text-5xl">Rooms, menu and <span className="italic text-[#D7B66A]">table orders.</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">Open the room listings, browse the restaurant menu, or visit the table-ordering page.</p>
          </div>
          <div data-reveal className="tule-reveal flex flex-wrap gap-3">
            <Link href="/guest/rooms" className="tule-btn-shimmer inline-flex items-center gap-2 rounded-full bg-[#D7B66A] px-5 py-3.5 text-[10px] font-black uppercase tracking-[.13em] text-[#07191E] transition duration-300 hover:-translate-y-0.5 hover:bg-[#F8D77A] active:scale-95">Plan your stay <ArrowUpRight className="h-4 w-4" /></Link>
            <Link href="/guest/table/tule-tbl-01-lakeview" className="tule-btn-shimmer inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3.5 text-[10px] font-bold uppercase tracking-[.13em] text-white/80 transition duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/5 active:scale-95"><QrCode className="h-4 w-4" /> Table QR order</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#041115] px-4 py-9 sm:px-7 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tule-resort-mark.svg" alt="Tule Resort" className="h-10 w-12 object-contain" />
            <span><span className="block font-display text-xl text-white">Tule Resort</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[.26em] text-white/40">Hawassa · Ethiopia</span></span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-[.13em] text-white/50">
            <Link href="/guest/rooms" className="hover:text-[#F8D77A]">Rooms</Link>
            <Link href="/guest/restaurant" className="hover:text-[#F8D77A]">Dining</Link>
            <Link href="/guest/services" className="hover:text-[#F8D77A]">Experiences</Link>
            <Link href="/staff/login" className="hover:text-[#F8D77A]">Staff portal</Link>
          </div>
          <div className="flex flex-col gap-2 text-[10px] text-white/40 sm:items-end">
            <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#D7B66A]" /> Lake Hawassa Shore, Sidama, Ethiopia</span>
            <a href="tel:+251994781422" className="inline-flex items-center gap-2 transition hover:text-white"><Phone className="h-3.5 w-3.5 text-[#D7B66A]" /> +251 994 781 422</a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1440px] border-t border-white/10 pt-5 text-[9px] uppercase tracking-[.16em] text-white/30">© {new Date().getFullYear()} Tule Resort</div>
      </footer>
    </main>
  );
}
