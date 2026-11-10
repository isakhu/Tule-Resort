import Link from 'next/link';
import { ArrowLeft, Clock3, Droplets, LifeBuoy, LockKeyhole, ShieldCheck, ShowerHead, Sun, Table2, Ticket, TowelRack, Users, Sparkles } from 'lucide-react';

const facilities = [
  ['Outdoor pool', 'Open-air swimming with a relaxed lakeside atmosphere.', Droplets],
  ["Children's pool", 'A dedicated shallow pool for younger guests.', Users],
  ['Poolside sun loungers', 'Relax comfortably between swims.', Sun],
  ['Umbrellas & shade', 'Enjoy the water while staying cool and comfortable.', Sun],
  ['Changing rooms', 'Convenient spaces to change before or after swimming.', ShowerHead],
  ['Showers', 'Freshen up before entering or after leaving the swimming area.', ShowerHead],
  ['Lockers', 'Secure storage for your personal belongings.', LockKeyhole],
  ['Poolside seating & tables', 'Comfortable spaces for relaxing with family and friends.', Table2],
  ['Pool towels', 'Towels are available for a comfortable pool visit.', TowelRack],
  ['Lifeguards', 'Lifeguard service is available to support a safer swimming experience.', LifeBuoy],
];

const safetyRules = [
  'No glass containers near the pool.',
  'Children must be supervised by an adult.',
  'Shower before entering the pool.',
  'No running around the pool deck.',
  'Proper swimming attire is required.',
];

export default function TuleAquaPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D]">
      <header className="relative overflow-hidden bg-[#163D32] text-[#F5F0E6] border-b border-[#C5A46D]/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(197,164,109,.15),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(138,155,131,.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/70 transition hover:text-[#C5A46D]">
            <ArrowLeft className="h-4 w-4" /> Guest services
          </Link>
          <div className="grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">
                <Droplets className="h-4 w-4" /> Tule Resort · Hawassa
              </p>
              <h1 className="mt-5 font-display text-6xl font-light tracking-tight md:text-8xl leading-none">
                TULE<br />
                <span className="italic font-normal text-[#C5A46D]">AQUA.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#F5F0E6]/80 md:text-lg">
                Swim, relax and reconnect. Enjoy our outdoor lake-view pool, dedicated children&apos;s pool, and a complete family-friendly poolside experience designed for unhurried relaxation.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#F5F0E6]">
                  <Clock3 className="h-4 w-4 text-[#C5A46D]" /> Open 24 hours
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#F5F0E6]">
                  <LifeBuoy className="h-4 w-4 text-[#C5A46D]" /> Certified Lifeguards
                </span>
                <Link
                  href="/guest/my-activity"
                  className="inline-flex items-center rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-6 py-3 text-xs font-black uppercase tracking-[.12em] text-[#163D32] transition shadow-md"
                >
                  Book a Pool Experience
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-[2.2rem] border border-[#C5A46D]/20 bg-[#0F2D24] p-2 shadow-2xl">
              <div className="relative flex h-[360px] items-end rounded-[1.8rem] overflow-hidden p-7 bg-[#163D32]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80"
                  alt="Tule Aqua Pool"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#163D32] via-[#163D32]/50 to-transparent" />
                <div className="relative z-10 text-[#F5F0E6]">
                  <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#C5A46D]">Lakefront Leisure</p>
                  <p className="mt-1 max-w-sm font-display text-2xl font-medium tracking-tight">
                    Calm waters, warm sun, and lakeside tranquility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#8A9B83]">Pool access</p>
            <h2 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl text-[#26312D]">
              Clear pricing. All-day water.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#26312D]/70 font-normal">
              Tule Aqua is available 24 hours a day, including twilight swimming, so guests can enjoy the pool experience on their own schedule.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <article className="rounded-3xl bg-[#163D32] p-6 text-[#F5F0E6] shadow-[0_15px_45px_rgba(22,61,50,.1)] border border-[#C5A46D]/20">
              <Ticket className="h-6 w-6 text-[#C5A46D]" />
              <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#F5F0E6]/60">Adults</p>
              <p className="mt-1 font-display text-3xl font-bold">400 <span className="text-sm font-sans font-normal text-[#C5A46D]">ETB</span></p>
            </article>
            <article className="rounded-3xl border border-[#163D32]/10 bg-white p-6 shadow-sm">
              <Users className="h-6 w-6 text-[#163D32]" />
              <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#8A9B83]">Children</p>
              <p className="mt-1 font-display text-3xl font-bold text-[#26312D]">300 <span className="text-sm font-sans font-normal text-[#8A9B83]">ETB</span></p>
            </article>
          </div>
        </section>

        <section className="mt-14">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#8A9B83]">Pool facilities</p>
          <h2 className="mt-2 font-display text-4xl font-medium tracking-tight md:text-5xl text-[#26312D]">
            Everything for a relaxing pool day.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {facilities.map(([title, description, Icon]) => {
              const FacilityIcon = Icon as typeof Droplets;
              return (
                <article
                  key={title as string}
                  className="rounded-3xl border border-[#163D32]/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C5A46D]/60 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F0E6] text-[#163D32]">
                    <FacilityIcon className="h-5 w-5 text-[#163D32]" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-medium text-[#26312D]">{title as string}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#26312D]/70">{description as string}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[2.2rem] bg-white border border-[#163D32]/10 p-8 md:p-10 shadow-[0_12px_40px_rgba(22,61,50,0.05)]">
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">Food &amp; drinks</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-[#26312D]">
              Order from the Tule Resort menu.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#26312D]/70">
              Poolside guests can enjoy snacks, cold drinks, iced juices, and hot dishes delivered straight to your lounger from the central restaurant kitchen.
            </p>
            <Link
              href="/guest/restaurant"
              className="mt-6 inline-flex rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-6 py-3 text-xs font-black uppercase tracking-[.13em] text-[#F5F0E6] transition"
            >
              View Dining Menu
            </Link>
          </div>

          <div className="rounded-[2.2rem] border border-[#163D32]/10 bg-white p-8 md:p-10 shadow-[0_12px_40px_rgba(22,61,50,0.05)]">
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#8A9B83]">Pool safety rules</p>
            <div className="mt-5 grid gap-3">
              {safetyRules.map((rule) => (
                <div key={rule} className="flex items-start gap-3 rounded-2xl bg-[#F5F0E6] p-3.5 border border-[#163D32]/5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#163D32]" />
                  <span className="text-sm font-medium leading-6 text-[#26312D]">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-[2.2rem] bg-[#163D32] p-8 text-[#F5F0E6] md:p-12 border border-[#C5A46D]/20 shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">Tule Aqua · 24 hours</p>
              <h2 className="mt-2 font-display text-3xl md:text-4xl font-medium tracking-tight">
                Make the water part of your stay.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#F5F0E6]/80">
                Family swimming, sunset views, and lakeside calm come together in our premier aquatic space.
              </p>
            </div>
            <Link
              href="/guest/my-activity"
              className="shrink-0 rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-7 py-4 text-center text-xs font-black uppercase tracking-[.13em] text-[#163D32] shadow-lg transition"
            >
              Book a Pool Experience
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
