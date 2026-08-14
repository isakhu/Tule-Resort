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
  return <div className="min-h-screen bg-[#F8FBFC] text-[#073B4C]">
    <header className="relative overflow-hidden bg-[#073B4C] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,162,39,.24),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(11,79,108,.9),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft className="h-4 w-4" /> Guest services</Link>
        <div className="py-14 md:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#E2C35A]"><Sparkles className="h-4 w-4" /> Tule Resort · Hawassa</p>
          <h1 className="mt-5 text-6xl font-black tracking-[-.07em] md:text-8xl">RESORT<br /><span className="text-[#C9A227]">SERVICES.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 md:text-lg">Everything that makes a stay easier, healthier, more comfortable and more memorable — delivered with Tule hospitality.</p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><Clock3 className="h-4 w-4 text-[#C9A227]" />Guest services · daily schedule</div>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{services.map(([name, description, Icon]) => { const ServiceIcon = Icon as typeof Sparkles; return <article key={name as string} className="rounded-3xl border border-[#0B4F6C]/10 bg-white p-6 shadow-[0_15px_45px_rgba(7,59,76,.07)]"><ServiceIcon className="h-7 w-7 text-[#0B4F6C]" /><h2 className="mt-5 text-xl font-black tracking-[-.03em]">{name as string}</h2><p className="mt-3 text-sm leading-6 text-[#073B4C]/55">{description as string}</p><Link href="/guest/my-activity" className="mt-5 inline-flex rounded-full bg-[#C9A227] px-4 py-3 text-[10px] font-black uppercase tracking-[.13em] text-[#073B4C]">Request / Book</Link></article>; })}</div>
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-[#EAF4F7] p-7 md:p-9"><Users className="h-7 w-7 text-[#0B4F6C]" /><h2 className="mt-4 text-3xl font-black tracking-[-.04em]">Family, wellness and business.</h2><p className="mt-3 text-sm leading-7 text-[#073B4C]/60">From a quiet wellness session to a family day or a productive conference, the service collection is designed for different kinds of stays.</p></div>
        <div className="rounded-[2rem] border border-[#C9A227]/30 bg-[#F3E9D2]/55 p-7 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#073B4C]/55">Guest assistance</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em]">One place to request help.</h2><p className="mt-3 text-sm leading-7 text-[#073B4C]/60">Use the guest activity area for service requests and bookings. Final prices, availability and operating details can be managed from the manager dashboard.</p><Link href="/guest/my-activity" className="mt-5 inline-flex rounded-full bg-[#0B4F6C] px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-white">Open Guest Activity</Link></div>
      </section>
    </main>
  </div>;
}
