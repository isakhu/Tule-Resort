import Link from 'next/link';
import { ArrowLeft, BedDouble, Sparkles } from 'lucide-react';
import RoomCard, { type RoomCardData } from '@/components/RoomCard';
import { getRooms } from '@/lib/rooms';
import { getResortServices } from '@/lib/resortServices';

export default async function RoomsPage() {
  const rooms = await getRooms();
  const services = await getResortServices();
  const accommodationImage = services.find((service) => service.id === 'rooms')?.imageUrl ?? '';

  const roomCards: RoomCardData[] = rooms.map((room) => ({
    id: room.slug || room.id,
    slug: room.slug || room.id,
    name: room.name,
    description: room.description,
    price: room.price,
    capacity: room.capacity ?? room.maxOccupancy ?? 2,
    maxOccupancy: room.maxOccupancy ?? room.capacity ?? 2,
    imageUrl: room.imageUrl || accommodationImage,
    amenities: room.amenities?.length ? room.amenities : ['Wi-Fi', 'Comfort stay', 'Resort access'],
    isAvailable: room.isAvailable,
  }));

  return (
    <div className="min-h-screen bg-[#F8FBFC] text-[#073B4C] pb-16">
      <header className="border-b border-[#0B4F6C]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-[#0B4F6C]/60 transition hover:text-[#0B4F6C]">
            <ArrowLeft className="h-4 w-4" /> Guest services
          </Link>
          <div className="mt-10 max-w-4xl pb-10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#0B4F6C]">
              <BedDouble className="h-4 w-4" /> Accommodation · Lake Hawassa
            </div>
            <h1 className="mt-3 text-5xl font-black tracking-[-.06em] text-[#073B4C] md:text-7xl">STAY BY THE LAKE.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#073B4C]/60 md:text-base">
              Discover comfortable Tule Resort rooms designed for restful stays, warm hospitality, and a relaxed lakeside experience in Hawassa.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#C9A227]/30 bg-[#F3E9D2]/50 px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-[#073B4C]">
              <Sparkles className="h-3.5 w-3.5 text-[#C9A227]" /> Five room experiences
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {roomCards.map((room) => <RoomCard key={room.id} room={room} />)}
        </div>
        <div className="mt-8 rounded-3xl border border-[#0B4F6C]/10 bg-[#EAF4F7] p-5 text-sm leading-7 text-[#073B4C]/65">
          Room prices shown are current draft Tule Resort prices and should be replaced with the approved final price list before launch.
        </div>
      </main>
    </div>
  );
}
