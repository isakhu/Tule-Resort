import Link from 'next/link';
import { ArrowLeft, BedDouble } from 'lucide-react';
import RoomBookingForm from '@/components/RoomBookingForm';
import { supabase } from '@/lib/supabaseClient';

export default async function RoomBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const { data: room } = await supabase
    .from('rooms')
    .select('id, slug, name, price, currency, capacity, is_available, is_active')
    .eq('slug', decodedSlug)
    .maybeSingle();

  if (!room || !room.is_active) {
    return (
      <main className="min-h-screen bg-[#F8FBFC] px-4 py-16 text-[#073B4C]">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black">Room not found</h1>
          <p className="mt-3 text-sm text-[#073B4C]/55">This room is no longer available.</p>
          <Link href="/guest/rooms" className="mt-6 inline-flex rounded-full bg-[#0B4F6C] px-6 py-3 text-xs font-black uppercase tracking-wider text-white">Back to rooms</Link>
        </div>
      </main>
    );
  }

  const maxGuests = Number(room.capacity ?? 1);
  const price = Number(room.price ?? 0);
  const currency = room.currency || 'ETB';

  return (
    <main className="min-h-screen bg-[#F8FBFC] pb-16 text-[#073B4C]">
      <header className="bg-[#073B4C] text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <Link href="/guest/rooms" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft className="h-4 w-4" /> All rooms</Link>
          <div className="py-10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#E2C35A]"><BedDouble className="h-4 w-4" /> Tule Resort · Reservation</div>
            <h1 className="mt-3 text-5xl font-black tracking-[-.06em] md:text-6xl">Reserve {room.name}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">Choose your dates and guest details. Payment is made at the resort and your request will be confirmed by the manager.</p>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {!room.is_available && <div className="mb-6 rounded-2xl border border-[#C9A227]/30 bg-[#F3E9D2] p-4 text-sm font-semibold">This room is currently marked unavailable. You can still submit a request for the manager to review.</div>}
        <RoomBookingForm roomId={room.id} roomName={room.name} price={price} currency={currency} maxGuests={maxGuests} />
      </section>
    </main>
  );
}
