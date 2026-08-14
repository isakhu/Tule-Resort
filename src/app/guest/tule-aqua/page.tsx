import Link from 'next/link';
import { ArrowLeft, Clock3, Droplets, HeartPulse, LifeBuoy, ShieldCheck, ShowerHead, Sun, Users } from 'lucide-react';

const facilities = [
  ['Outdoor pool', 'Open-air swimming with a relaxed lakeside atmosphere.', Droplets],
  ['Indoor pool', 'A comfortable all-weather swimming experience.', Droplets],
  ["Children's pool", 'A shallow space designed for younger guests.', Users],
  ["Children's play area", 'Family-friendly space beside the children’s pool.', Users],
  ['Poolside loungers & umbrellas', 'Relax in the sun or shade between swims.', Sun],
  ['Poolside towels', 'Convenient towel access for a comfortable visit.', ShowerHead],
  ['Poolside food & drinks', 'Enjoy refreshments without leaving the pool experience.', Droplets],
  ['Changing rooms & showers', 'Freshen up before or after your swim.', ShowerHead],
];

const safety = [
  ['Lifeguard service', LifeBuoy],
  ['First-aid equipment', HeartPulse],
  ['Pool depth signs', ShieldCheck],
  ['Non-slip pool areas', ShieldCheck],
];

export default function TuleAquaPage() {
  return (
    <div className="min-h-screen bg-[#F8FBFC] text-[#073B4C]">
      <header className="relative overflow-hidden bg-[#073B4C] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,162,39,.24),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(11,79,108,.9),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Guest services</Link>
          <div className="grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#E2C35A]"><Droplets className="h-4 w-4" /> Tule Resort · Hawassa</p>
              <h1 className="mt-5 text-6xl font-black tracking-[-.07em] md:text-8xl">TULE<br /><span className="text-[#C9A227]">AQUA.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/65 md:text-lg">Swim, relax and reconnect. Enjoy indoor and outdoor pools, a dedicated children’s pool and a family-friendly poolside experience designed for relaxation and memorable days.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><Clock3 className="h-4 w-4 text-[#C9A227]" />6:00 AM – 10:00 PM</span>
                <Link href="/guest/my-activity" className="inline-flex items-center rounded-full bg-[#C9A227] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#073B4C] transition hover:scale-[1.02]">Book a Pool Experience</Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-2xl">
              <div className="flex h-[360px] items-end rounded-[1.5rem] bg-[linear-gradient(160deg,#8fd0dc,#0B4F6C_58%,#073B4C)] p-7">
                <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#F3E9D2]">Lake-inspired leisure</p><p className="mt-2 max-w-sm text-2xl font-black tracking-[-.03em]">Luxury, tropical calm and family time by the water.</p></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <section>
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]/55">Pool facilities</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">Everything for a better pool day.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {facilities.map(([title, description, Icon]) => {
              const FacilityIcon = Icon as typeof Droplets;
              return <article key={title as string} className="rounded-3xl border border-[#0B4F6C]/10 bg-white p-5 shadow-[0_15px_45px_rgba(7,59,76,.07)]"><FacilityIcon className="h-6 w-6 text-[#0B4F6C]" /><h3 className="mt-5 font-black text-[#073B4C]">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#073B4C]/55">{description as string}</p></article>;
            })}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[2rem] bg-[#EAF4F7] p-7 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#0B4F6C]/55">Family at the water</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">A place for every generation.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#073B4C]/60">Cool off in the pools, let younger guests enjoy the shallow children’s pool and play area, then settle into a lounger for a relaxed afternoon. The experience is designed to balance family fun with quiet resort comfort.</p></div>
          <div className="rounded-[2rem] border border-[#C9A227]/30 bg-[#F3E9D2]/55 p-7 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#073B4C]/55">Pool safety</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{safety.map(([title, Icon]) => { const SafetyIcon = Icon as typeof ShieldCheck; return <div key={title as string} className="flex items-center gap-3 rounded-2xl bg-white/70 p-3"><SafetyIcon className="h-5 w-5 text-[#0B4F6C]" /><span className="text-sm font-bold text-[#073B4C]">{title as string}</span></div>; })}</div></div>
        </section>

        <section className="mt-14 rounded-[2rem] bg-[#0B4F6C] p-8 text-white md:p-10"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#E2C35A]">Tule Aqua</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Make the water part of your stay.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">Pool access, family time and lakeside relaxation come together in one bright resort experience.</p></div><Link href="/guest/my-activity" className="shrink-0 rounded-full bg-[#C9A227] px-6 py-4 text-center text-xs font-black uppercase tracking-[.13em] text-[#073B4C]">Book a Pool Experience</Link></div></section>
      </main>
    </div>
  );
}
