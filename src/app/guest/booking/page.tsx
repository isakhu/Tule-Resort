import Link from 'next/link';
import { ArrowLeft, BedDouble, CalendarDays, CheckCircle2, ChevronRight, Users, UtensilsCrossed, Waves } from 'lucide-react';

const steps = [
  ['1', 'Choose experience'],
  ['2', 'Select date & guests'],
  ['3', 'Guest details'],
  ['4', 'Confirmation'],
];

export default function BookingPage() {
  return <div className="min-h-screen bg-[#F8FBFC] text-[#073B4C]">
    <header className="bg-[#073B4C] text-white"><div className="mx-auto max-w-6xl px-4 py-6 md:px-6"><Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft className="h-4 w-4" /> Guest services</Link><div className="py-12"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#E2C35A]">Tule Resort · Booking</p><h1 className="mt-3 text-5xl font-black tracking-[-.06em] md:text-7xl">Plan your stay.</h1><p className="mt-4 max-w-2xl text-white/60">A simple visual booking flow for rooms, dining and resort services.</p></div></div></header>
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="grid gap-3 sm:grid-cols-4">{steps.map(([n, label], i) => <div key={n} className={`rounded-2xl p-4 ${i === 0 ? 'bg-[#C9A227] text-[#073B4C]' : 'bg-white border border-[#0B4F6C]/10 text-[#073B4C]/55'}`}><span className="text-xs font-black">{n}</span><p className="mt-1 text-sm font-bold">{label}</p></div>)}</div>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Link href="/guest/rooms" className="rounded-[2rem] border border-[#0B4F6C]/10 bg-white p-7 shadow-sm transition hover:-translate-y-1"><BedDouble className="h-7 w-7 text-[#0B4F6C]" /><h2 className="mt-5 text-2xl font-black">Book a Room</h2><p className="mt-2 text-sm leading-6 text-[#073B4C]/55">Choose your room, dates and number of guests.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">Start <ChevronRight className="h-4 w-4" /></span></Link>
        <Link href="/guest/restaurant" className="rounded-[2rem] border border-[#0B4F6C]/10 bg-white p-7 shadow-sm transition hover:-translate-y-1"><UtensilsCrossed className="h-7 w-7 text-[#0B4F6C]" /><h2 className="mt-5 text-2xl font-black">Reserve Dining</h2><p className="mt-2 text-sm leading-6 text-[#073B4C]/55">Choose date, time, party size and dining setting.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">Start <ChevronRight className="h-4 w-4" /></span></Link>
        <Link href="/guest/services" className="rounded-[2rem] border border-[#0B4F6C]/10 bg-white p-7 shadow-sm transition hover:-translate-y-1"><Waves className="h-7 w-7 text-[#0B4F6C]" /><h2 className="mt-5 text-2xl font-black">Book a Service</h2><p className="mt-2 text-sm leading-6 text-[#073B4C]/55">Request spa, massage, transport, fitness or event services.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">Start <ChevronRight className="h-4 w-4" /></span></Link>
      </section>
      <section className="mt-8 rounded-[2rem] bg-white border border-[#0B4F6C]/10 p-7 md:p-9"><div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-[#0B4F6C]" /><h2 className="text-2xl font-black">Booking details we will collect</h2></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#EAF4F7] p-4"><Users className="h-5 w-5" /><p className="mt-3 font-bold">Dates & guests</p><p className="mt-1 text-sm text-[#073B4C]/55">Check-in/check-out, party size and availability.</p></div><div className="rounded-2xl bg-[#F3E9D2]/55 p-4"><CheckCircle2 className="h-5 w-5" /><p className="mt-3 font-bold">Guest confirmation</p><p className="mt-1 text-sm text-[#073B4C]/55">Confirmation screen, booking number and status.</p></div></div></section>
    </main>
  </div>;
}
