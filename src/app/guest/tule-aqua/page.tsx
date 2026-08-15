import Link from 'next/link';
import { ArrowLeft, Clock3, Droplets, LifeBuoy, LockKeyhole, ShieldCheck, ShowerHead, Sun, Table2, Ticket, Towel, Users } from 'lucide-react';

const facilities = [
  ['Outdoor pool', 'Open-air swimming with a relaxed lakeside atmosphere.', Droplets],
  ["Children's pool", 'A dedicated shallow pool for younger guests.', Users],
  ['Poolside sun loungers', 'Relax comfortably between swims.', Sun],
  ['Umbrellas & shade', 'Enjoy the water while staying cool and comfortable.', Sun],
  ['Changing rooms', 'Convenient spaces to change before or after swimming.', ShowerHead],
  ['Showers', 'Freshen up before entering or after leaving the pool.', ShowerHead],
  ['Lockers', 'Secure storage for your personal belongings.', LockKeyhole],
  ['Poolside seating & tables', 'Comfortable spaces for relaxing with family and friends.', Table2],
  ['Pool towels', 'Towels are available for a comfortable pool visit.', Towel],
  ['Lifeguards', 'Lifeguard service is available to support a safer swimming experience.', LifeBuoy],
];

const safetyRules = [
  'No glass containers near the pool.',
  'Children must be supervised by an adult.',
  'Shower before entering the pool.',
  'No running around the pool.',
  'Proper swimming attire is required.',
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
              <p className="mt-6 max-w-xl text-base leading-8 text-white/65 md:text-lg">Swim, relax and reconnect. Enjoy our outdoor pool, dedicated children’s pool and a complete family-friendly poolside experience designed for relaxation at any hour.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><Clock3 className="h-4 w-4 text-[#C9A227]" />Open 24 hours</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><LifeBuoy className="h-4 w-4 text-[#C9A227]" />Lifeguards</span>
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
        <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]/55">Pool access</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">Simple pricing. All-day water.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#073B4C]/60">Tule Aqua is available 24 hours a day, including night swimming, so guests can enjoy the pool experience on their own schedule.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <article className="rounded-3xl bg-[#0B4F6C] p-6 text-white shadow-[0_15px_45px_rgba(7,59,76,.12)]"><Ticket className="h-6 w-6 text-[#E2C35A]" /><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-white/55">Adults</p><p className="mt-1 text-3xl font-black">400 <span className="text-sm text-white/55">birr</span></p></article>
            <article className="rounded-3xl border border-[#C9A227]/30 bg-[#F3E9D2] p-6"><Users className="h-6 w-6 text-[#0B4F6C]" /><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#073B4C]/55">Children</p><p className="mt-1 text-3xl font-black">300 <span className="text-sm text-[#073B4C]/55">birr</span></p></article>
          </div>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]/55">Pool facilities</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">Everything for a better pool day.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {facilities.map(([title, description, Icon]) => {
              const FacilityIcon = Icon as typeof Droplets;
              return <article key={title as string} className="rounded-3xl border border-[#0B4F6C]/10 bg-white p-5 shadow-[0_15px_45px_rgba(7,59,76,.07)]"><FacilityIcon className="h-6 w-6 text-[#0B4F6C]" /><h3 className="mt-5 font-black text-[#073B4C]">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#073B4C]/55">{description as string}</p></article>;
            })}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[2rem] bg-[#EAF4F7] p-7 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#0B4F6C]/55">Food & drinks</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Order from the Tule Resort menu.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#073B4C]/60">Poolside guests can enjoy snacks, soft drinks, coffee and juice from the normal Tule Resort restaurant menu, so there is no separate poolside menu to manage.</p><Link href="/guest/resort-menu" className="mt-6 inline-flex rounded-full bg-[#0B4F6C] px-5 py-3 text-xs font-black uppercase tracking-[.13em] text-white">View Resort Menu</Link></div>
          <div className="rounded-[2rem] border border-[#C9A227]/30 bg-[#F3E9D2]/55 p-7 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#073B4C]/55">Pool safety rules</p><div className="mt-5 grid gap-3">{safetyRules.map((rule) => <div key={rule} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B4F6C]" /><span className="text-sm font-bold leading-6 text-[#073B4C]">{rule}</span></div>)}</div></div>
        </section>

        <section className="mt-14 rounded-[2rem] bg-[#0B4F6C] p-8 text-white md:p-10"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#E2C35A]">Tule Aqua · 24 hours</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Make the water part of your stay.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">Family swimming, night swimming and lakeside relaxation come together in one bright resort experience.</p></div><Link href="/guest/my-activity" className="shrink-0 rounded-full bg-[#C9A227] px-6 py-4 text-center text-xs font-black uppercase tracking-[.13em] text-[#073B4C]">Book a Pool Experience</Link></div></section>
      </main>
    </div>
  );
}
