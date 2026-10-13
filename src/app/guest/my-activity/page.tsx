import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock3, UtensilsCrossed, Waves } from 'lucide-react';

export default function MyActivityPage() {
  return (
    <main className="min-h-screen bg-[#F8F5EE] px-4 pb-20 text-[#182326]">
      <header className="mx-auto flex max-w-3xl items-center gap-4 border-b border-[#0B3D4A]/10 py-5">
        <Link href="/guest" aria-label="Back to guest services" className="rounded-full p-2 text-[#0B3D4A]/70 transition hover:bg-white hover:text-[#0B3D4A]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8A15A]">Tule Resort</p>
          <h1 className="font-display text-2xl font-bold text-[#0B3D4A]">My Activity</h1>
        </div>
      </header>

      <section className="mx-auto mt-12 max-w-3xl">
        <div className="rounded-[2rem] border border-[#0B3D4A]/10 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF4F7] text-[#0B4F6C]">
            <Clock3 className="h-8 w-8" />
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold text-[#0B3D4A]">Your activity will appear here</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#182326]/60">
            Live order and reservation history is not connected to this page yet. We won't show sample activity as if it were your real bookings.
          </p>
          <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
            <Link href="/guest/restaurant" className="rounded-2xl border border-[#0B3D4A]/10 bg-[#F8F5EE] p-4 transition hover:border-[#159A9C]">
              <UtensilsCrossed className="h-5 w-5 text-[#159A9C]" />
              <p className="mt-3 text-sm font-bold">Restaurant menu</p>
              <p className="mt-1 text-xs leading-5 text-[#182326]/55">Browse food and drinks.</p>
            </Link>
            <Link href="/guest/rooms" className="rounded-2xl border border-[#0B3D4A]/10 bg-[#F8F5EE] p-4 transition hover:border-[#159A9C]">
              <CalendarDays className="h-5 w-5 text-[#159A9C]" />
              <p className="mt-3 text-sm font-bold">Rooms & stays</p>
              <p className="mt-1 text-xs leading-5 text-[#182326]/55">Explore room options.</p>
            </Link>
            <Link href="/guest/services" className="rounded-2xl border border-[#0B3D4A]/10 bg-[#F8F5EE] p-4 transition hover:border-[#159A9C]">
              <Waves className="h-5 w-5 text-[#159A9C]" />
              <p className="mt-3 text-sm font-bold">Resort services</p>
              <p className="mt-1 text-xs leading-5 text-[#182326]/55">Explore guest experiences.</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
