import Link from 'next/link';
import { ArrowLeft, BedDouble, CalendarDays, CheckCircle2, ChevronRight, Users, UtensilsCrossed, Waves, Sparkles } from 'lucide-react';

const steps = [
  ['1', 'Choose experience'],
  ['2', 'Select date & guests'],
  ['3', 'Guest details'],
  ['4', 'Confirmation'],
];

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D]">
      <header className="bg-[#163D32] text-[#F5F0E6] border-b border-[#C5A46D]/20">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/70 hover:text-[#C5A46D] transition">
            <ArrowLeft className="h-4 w-4" /> Guest services
          </Link>
          <div className="py-12">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-3.5 py-1 text-[10px] font-black uppercase tracking-[.25em] text-[#C5A46D]">
              <Sparkles className="h-3 w-3" /> Tule Resort · Booking
            </p>
            <h1 className="mt-4 font-display text-5xl font-light tracking-tight md:text-7xl leading-none">
              Plan your <span className="italic font-normal text-[#C5A46D]">stay.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[#F5F0E6]/80 text-sm md:text-base leading-relaxed">
              A refined booking journey for lakefront rooms, private dining and personalized resort services.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {steps.map(([n, label], i) => (
            <div
              key={n}
              className={`rounded-2xl p-4 transition ${
                i === 0
                  ? 'bg-[#163D32] text-[#F5F0E6] shadow-md border border-[#C5A46D]/40'
                  : 'bg-white border border-[#163D32]/10 text-[#26312D]/60'
              }`}
            >
              <span className={`text-xs font-black ${i === 0 ? 'text-[#C5A46D]' : 'text-[#8A9B83]'}`}>{n}</span>
              <p className="mt-1 text-sm font-bold">{label}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            href="/guest/rooms"
            className="group rounded-[2rem] border border-[#163D32]/10 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C5A46D]/60 hover:shadow-[0_20px_45px_rgba(22,61,50,0.08)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0E6] text-[#163D32] border border-[#163D32]/10">
              <BedDouble className="h-6 w-6 text-[#163D32]" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-medium tracking-tight text-[#26312D] group-hover:text-[#163D32]">
              Book a Room
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#26312D]/70 font-normal">
              Choose your suite, dates, and number of guests on Lake Hawassa shore.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#C5A46D] group-hover:text-[#163D32]">
              Start <ChevronRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/guest/restaurant"
            className="group rounded-[2rem] border border-[#163D32]/10 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C5A46D]/60 hover:shadow-[0_20px_45px_rgba(22,61,50,0.08)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0E6] text-[#163D32] border border-[#163D32]/10">
              <UtensilsCrossed className="h-6 w-6 text-[#163D32]" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-medium tracking-tight text-[#26312D] group-hover:text-[#163D32]">
              Reserve Dining
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#26312D]/70 font-normal">
              Select date, party size, and lake-view table setting for breakfast, lunch or dinner.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#C5A46D] group-hover:text-[#163D32]">
              Start <ChevronRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/guest/services"
            className="group rounded-[2rem] border border-[#163D32]/10 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C5A46D]/60 hover:shadow-[0_20px_45px_rgba(22,61,50,0.08)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0E6] text-[#163D32] border border-[#163D32]/10">
              <Waves className="h-6 w-6 text-[#163D32]" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-medium tracking-tight text-[#26312D] group-hover:text-[#163D32]">
              Book a Service
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#26312D]/70 font-normal">
              Request spa treatments, private airport transfers, fitness sessions, or event spaces.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#C5A46D] group-hover:text-[#163D32]">
              Start <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        </section>

        <section className="mt-8 rounded-[2.2rem] bg-white border border-[#163D32]/10 p-7 md:p-9 shadow-[0_12px_40px_rgba(22,61,50,0.04)]">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-[#163D32]" />
            <h2 className="font-display text-2xl font-medium tracking-tight text-[#26312D]">
              Booking details we collect
            </h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F5F0E6] p-5 border border-[#163D32]/8">
              <Users className="h-5 w-5 text-[#163D32]" />
              <p className="mt-3 font-bold text-[#26312D]">Dates &amp; guests</p>
              <p className="mt-1 text-sm text-[#26312D]/70">
                Check-in/check-out dates, suite selection, and room occupancy.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5F0E6] p-5 border border-[#163D32]/8">
              <CheckCircle2 className="h-5 w-5 text-[#C5A46D]" />
              <p className="mt-3 font-bold text-[#26312D]">Guest confirmation</p>
              <p className="mt-1 text-sm text-[#26312D]/70">
                Direct booking confirmation code, concierge check-in, and instant receipts.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
