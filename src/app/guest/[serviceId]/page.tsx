import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { getResortService } from '@/lib/resortServices';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}): Promise<Metadata> {
  const { serviceId } = await params;
  const service = await getResortService(decodeURIComponent(serviceId));

  if (!service) {
    return {
      title: 'Guest Service',
      description: 'Explore bespoke hospitality services at Tule Resort, Hawassa.',
    };
  }

  return {
    title: service.name,
    description: service.description,
    openGraph: {
      title: `${service.name} | Tule Resort Hawassa`,
      description: service.description,
      images: service.imageUrl ? [{ url: service.imageUrl, alt: service.name }] : undefined,
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const decodedId = decodeURIComponent(serviceId).trim().toLowerCase();

  if (decodedId === 'rooms') {
    redirect('/guest/rooms');
  }
  if (decodedId === 'restaurant') {
    redirect('/guest/restaurant');
  }
  if (decodedId === 'cafeteria') {
    redirect('/guest/cafeteria');
  }
  if (decodedId === 'pool-passes' || decodedId === 'tule-aqua') {
    redirect('/guest/tule-aqua');
  }
  if (decodedId === 'experiences') {
    redirect('/guest/services');
  }

  const service = await getResortService(decodeURIComponent(serviceId));
  if (!service) {
    notFound();
  }

  const requestHref = `/guest/${encodeURIComponent(service.id)}/request`;

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D]">
      <header className="relative overflow-hidden bg-[#163D32] text-[#F5F0E6] border-b border-[#C5A46D]/20">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/guest/services"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#F5F0E6]/80 hover:text-[#C5A46D] transition"
            >
              <ArrowLeft className="h-4 w-4" /> Resort Services
            </Link>
            <Link
              href="/guest"
              className="text-xs font-black uppercase tracking-[.2em] text-[#C5A46D] hover:underline"
            >
              Guest Portal
            </Link>
          </div>

          <div className="py-12 md:py-16 grid gap-8 lg:grid-cols-[1.1fr_.9fr] items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-4 py-1.5 text-[10px] font-black uppercase tracking-[.24em] text-[#C5A46D]">
                <Sparkles className="h-3.5 w-3.5" /> {service.eyebrow}
              </p>
              <h1 className="mt-5 font-display text-4xl sm:text-6xl font-light tracking-tight leading-none text-[#F5F0E6]">
                {service.name}
              </h1>
              <p className="mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-[#F5F0E6]/85">
                {service.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={requestHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[#C5A46D] hover:bg-[#B8955E] px-6 py-3.5 text-xs font-black uppercase tracking-[.14em] text-[#163D32] shadow-lg transition"
                >
                  Request This Service <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/guest/booking"
                  className="inline-flex items-center gap-2 rounded-full border border-[#C5A46D]/40 bg-[#0F2D24] px-6 py-3.5 text-xs font-bold uppercase tracking-[.14em] text-[#F5F0E6] hover:border-[#C5A46D] transition"
                >
                  Book a Stay
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[#C5A46D]/30 bg-[#0F2D24] shadow-2xl h-64 sm:h-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={service.imageUrl}
                alt={service.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {service.features.length > 0 && (
          <section className="rounded-[2rem] border border-[#163D32]/10 bg-white p-8 shadow-sm">
            <h2 className="font-display text-2xl font-medium text-[#26312D]">
              Included Highlights
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {service.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2.5 rounded-2xl bg-[#F5F0E6] px-4 py-3 text-sm font-semibold text-[#26312D] border border-[#163D32]/8"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#163D32] shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
