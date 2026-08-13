import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, Clock3, Sparkles } from 'lucide-react';
import VisualResortMenu from '@/components/VisualResortMenu';
import { getResortService } from '@/data/resort-services';

export default async function ServicePage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const service = getResortService(serviceId);

  if (!service) {
    return <div className="min-h-screen bg-[#0C0B09] text-white grid place-items-center"><Link href="/guest" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-stone-950">Back to guest services</Link></div>;
  }

  if (service.type === 'orderable' && service.id === 'restaurant') {
    return <VisualResortMenu serviceName={service.name} />;
  }

  return (
    <div className="min-h-screen bg-[#0C0B09] text-white pb-16">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0C0B09]/90 backdrop-blur-xl"><div className="mx-auto max-w-6xl px-4 md:px-6 py-4 flex items-center justify-between gap-4"><Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft className="h-4 w-4" />Guest services</Link><span className="hidden sm:inline text-[10px] font-black uppercase tracking-[.2em] text-white/35">Haile Resort • {service.eyebrow}</span></div></header>
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-7 md:py-12">
        <section className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#15130F] shadow-[0_30px_90px_rgba(0,0,0,.35)]">
          <img src={service.imageUrl} alt={service.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08)_0%,rgba(0,0,0,.18)_35%,rgba(0,0,0,.92)_100%)]" />
          <div className="absolute inset-x-5 bottom-5 md:inset-x-10 md:bottom-10 max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.25em]" style={{ color: service.accent }}>{service.eyebrow}</p><h1 className="mt-2 text-5xl md:text-7xl font-black tracking-[-.06em] leading-[.88]">{service.name}</h1><p className="mt-5 max-w-2xl text-sm md:text-base leading-relaxed text-white/70">{service.description}</p><div className="mt-5 flex flex-wrap gap-2">{service.features.map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-bold text-white/75 backdrop-blur-md">{feature}</span>)}</div></div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 md:p-8"><div className="flex items-center gap-3"><span className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center"><Sparkles className="h-5 w-5" style={{ color: service.accent }} /></span><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">Guest experience</p><h2 className="text-xl font-black">Designed around your stay</h2></div></div><p className="mt-5 text-sm leading-relaxed text-white/55">This service page uses the official Haile service category as its content reference while keeping actions inside your guest application. Connect a real booking or request workflow when the corresponding Supabase data is ready.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{service.features.map((feature) => <div key={feature} className="flex items-center gap-3 rounded-2xl bg-white/5 p-4"><CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: service.accent }} /><span className="text-xs font-bold text-white/70">{feature}</span></div>)}</div></div>
          <aside className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 md:p-8"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">Next step</p><h3 className="mt-2 text-2xl font-black">{service.type === 'bookable' ? 'Request a booking' : service.type === 'request' ? 'Send a request' : 'Explore details'}</h3><p className="mt-3 text-xs leading-relaxed text-white/45">Use the guest workflow for this service. Live rates and availability are not invented here.</p><Link href={service.type === 'request' ? `/guest/${service.id}/request` : '/guest/my-activity'} className="mt-6 flex items-center justify-between rounded-full px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-stone-950" style={{ backgroundColor: service.accent }}>{service.type === 'request' ? 'Submit request' : 'Continue'}<ChevronRight className="h-4 w-4" /></Link><div className="mt-4 flex items-center gap-2 text-[10px] text-white/30"><Clock3 className="h-3.5 w-3.5" />Availability requires a connected source</div><a href={service.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold text-white/45 hover:text-white">Official information<ArrowUpRight className="h-3.5 w-3.5" /></a></aside>
        </section>
      </main>
    </div>
  );
}
