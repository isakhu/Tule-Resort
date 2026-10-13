import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Sparkles, BedDouble } from 'lucide-react';
import RoomBookingForm from '@/components/RoomBookingForm';
import { getRoomBySlug } from '@/lib/rooms';

export default async function RoomBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const room = await getRoomBySlug(decodedSlug);

  if (!room) {
    return (
      <main className="min-h-screen bg-[#FFF9F2] px-4 py-20 text-[#1E293B] flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-gray-900">Accommodation Not Found</h1>
          <p className="mt-3 text-xs text-gray-500">
            The requested room accommodation could not be found or is currently unavailable.
          </p>
          <Link
            href="/guest/rooms"
            className="mt-6 inline-flex rounded-xl bg-[#073B4C] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0B4F6C]"
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
    <main className="min-h-screen bg-[#F8FBFC] text-[#1E293B] pb-24">
      {/* ─── TOP HEADER (Image 3 Header) ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 py-4 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href={`/guest/rooms/${encodeURIComponent(room.slug || room.id)}`}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <h1 className="text-base font-black text-gray-900 tracking-tight">
            Complete Booking
          </h1>

          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* ─── COMPLETE BOOKING FORM CONTAINER ─── */}
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
