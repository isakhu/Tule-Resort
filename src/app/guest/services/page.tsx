import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, Car, Dumbbell, Heart, Baby, ConciergeBell, Clock3, Sparkles, Users, UtensilsCrossed } from 'lucide-react';

const services = [
  ['Spa & Wellness', 'Facial and beauty treatments, sauna or steam, relaxation areas and wellness packages.', Sparkles],
  ['Gym & Fitness', 'Weight training, personal training and fitness classes for guests who want to stay active.', Dumbbell],
  ['Massage', 'Swedish, deep tissue, relaxation, couples and Ethiopian-inspired treatments.', Heart],
  ['Airport Transportation', 'Private airport pickup and drop-off arranged for a smoother arrival and departure.', Car],
  ['Concierge', 'Restaurant reservations, transportation, recommendations, guest requests and activities.', ConciergeBell],
  ['Family Services', 'Children’s play area, family activities, children’s pool and family-room assistance.', Baby],
  ['Conference & Business', 'Meeting rooms, conference halls and event planning for business and gatherings.', BriefcaseBusiness],
  ['Room Service', 'Food, drinks, breakfast and late-night dining requests delivered to your room.', UtensilsCrossed],
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D]">
      <header className="relative overflow-hidden bg-[#163D32] text-[#F5F0E6]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(197,164,109,.15),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(138,155,131,.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/70 hover:text-[#C5A46D] transition">
            <ArrowLeft className="h-4 w-4" /> Guest services
          </Link>
          <div className="py-14 md:py-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">
              <Sparkles className="h-4 w-4" /> Tule Resort · Hawassa
            </p>
            <h1 className="mt-5 font-display text-6xl font-light tracking-tight md:text-8xl leading-none">
              RESORT<br />
              <span className="italic font-normal text-[#C5A46D]">SERVICES.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#F5F0E6]/80 md:text-lg">
              Everything that makes a stay easier, healthier, more comfortable and more memorable — delivered with Tule hospitality.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-[#F5F0E6]">
              <Clock3 className="h-4 w-4 text-[#C5A46D]" /> Guest services · daily schedule
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map(([name, description, Icon]) => {
            const ServiceIcon = Icon as typeof Sparkles;
            return (
              <article
                key={name as string}
                className="group rounded-3xl border border-[#163D32]/10 bg-white p-7 shadow-[0_12px_35px_rgba(22,61,50,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#C5A46D]/60 hover:shadow-[0_20px_45px_rgba(22,61,50,0.1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0E6] text-[#163D32] border border-[#163D32]/10">
                    <ServiceIcon className="h-6 w-6 text-[#163D32]" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-medium tracking-tight text-[#26312D]">
                    {name as string}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#26312D]/70 font-normal">
                    {description as string}
                  </p>
                </div>
                <Link
                  href="/guest/my-activity"
                  className="mt-6 inline-flex justify-center rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-5 py-2.5 text-[10px] font-black uppercase tracking-[.14em] text-[#F5F0E6] transition duration-200"
                >
                  Request / Book
                </Link>
              </article>
            );
          })}
        </div>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2.2rem] bg-white border border-[#163D32]/10 p-8 md:p-10 shadow-[0_12px_40px_rgba(22,61,50,0.05)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0E6] text-[#163D32]">
              <Users className="h-6 w-6 text-[#163D32]" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-[#26312D]">
              Family, wellness and business.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#26312D]/70">
              From a quiet wellness session to a family day or a productive conference, our service collection is designed for all kinds of stays.
            </p>
          </div>

          <div className="rounded-[2.2rem] border border-[#C5A46D]/30 bg-[#163D32] p-8 md:p-10 text-[#F5F0E6] shadow-[0_15px_45px_rgba(22,61,50,0.15)]">
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">
              Guest assistance
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-[#F5F0E6]">
              One place to request help.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#F5F0E6]/80">
              Use the guest activity area for service requests, room delivery, and bookings with direct concierge tracking.
            </p>
            <Link
              href="/guest/my-activity"
              className="mt-6 inline-flex rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-[#163D32] shadow-md transition"
            >
              Open Guest Activity
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
