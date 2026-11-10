import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RoomBookingForm from '@/components/RoomBookingForm';
import { getRoomBySlug } from '@/lib/rooms';

export default async function RoomBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const room = await getRoomBySlug(decodedSlug);

  if (!room) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-4 py-20 text-[#26312D] flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-3xl border border-[#163D32]/10 bg-white p-8 text-center shadow-xl">
          <h1 className="font-display text-2xl font-bold text-[#26312D]">Accommodation Not Found</h1>
          <p className="mt-3 text-xs text-[#8A9B83]">
            The requested room accommodation could not be found or is currently unavailable.
          </p>
          <Link
            href="/guest/rooms"
            className="mt-6 inline-flex rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-6 py-2.5 text-xs font-bold text-[#F5F0E6] transition"
          >
            Back to Accommodations
          </Link>
        </div>
      </main>
    );
  }

  const maxGuests = Number(room.maxOccupancy ?? room.capacity ?? 2);
  const price = Number(room.price ?? 0);
  const currency = 'ETB';

  return (
    <main className="min-h-screen bg-[#F5F0E6] text-[#26312D] pb-24">
      {/* ─── TOP HEADER ─── */}
      <header className="sticky top-0 z-40 bg-[#163D32] text-[#F5F0E6] border-b border-[#C5A46D]/20 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href={`/guest/rooms/${encodeURIComponent(room.slug || room.id)}`}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-white/10 text-[#F5F0E6] hover:bg-white/20 transition-colors"
            aria-label="Back to room details"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <h1 className="font-display text-lg font-medium text-[#F5F0E6] tracking-wide">
            Complete Reservation
          </h1>

          <div className="w-9" />
        </div>
      </header>

      {/* ─── BOOKING FORM CONTAINER ─── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        <RoomBookingForm
          roomId={room.id}
          roomName={room.name}
          price={price}
          currency={currency}
          maxGuests={maxGuests}
          imageUrl={room.imageUrl}
          roomType={room.type}
          bedType={room.bedType}
          sizeSqm={room.sizeSqm}
          location="Hawassa, Sidama • Lake Shorefront"
          view={room.view}
        />
      </div>
    </main>
  );
}
