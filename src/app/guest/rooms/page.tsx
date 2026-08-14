import Link from 'next/link';
import { ArrowLeft, BedDouble } from 'lucide-react';
import RoomCard, { type RoomCardData } from '@/components/RoomCard';
import { getRooms } from '@/lib/rooms';
import { getResortServices } from '@/lib/resortServices';

const roomAmharic: Record<string, string> = {
  twin: 'መንታ አልጋ ክፍል',
  suite: 'ሱዊት ክፍል',
  family: 'የቤተሰብ ክፍል',
  presidential: 'ፕሬዚዳንታዊ ሱዊት',
};

export default async function RoomsPage() {
  const rooms = await getRooms();
  const services = await getResortServices();
  const accommodationImage = services.find((service) => service.id === 'rooms')?.imageUrl ?? '';

  const roomCards: RoomCardData[] = rooms.map((room) => ({
    id: room.slug || room.id,
    name: room.name,
    amharicName: roomAmharic[room.slug] ?? 'የማረፊያ ክፍል',
    description: room.description,
    price: room.price,
    area: `${room.capacity ?? room.maxOccupancy ?? 2} guests`,
    view: room.type || 'Resort view',
    bed: room.type || 'Standard',
    imageUrl: room.imageUrl || accommodationImage,
    features: room.amenities && room.amenities.length > 0 ? room.amenities : ['Wi-Fi', 'Comfort stay', 'Resort access'],
  }));

  return (
    <div className="min-h-screen bg-[#0C0B09] text-white pb-16">
      <header className="border-b border-white/10 bg-[#17120D]"><div className="mx-auto max-w-7xl px-4 md:px-6 py-5"><Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" />Guest services</Link><div className="mt-10 pb-8"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#F2B84B]"><BedDouble className="h-4 w-4" />Accommodation</div><h1 className="mt-3 text-5xl md:text-7xl font-black tracking-[-.06em]">STAY YOUR WAY.</h1><p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-white/55">Compare Tule Resort rooms with the same visual-card style as the food menu: photo, Amharic name, description, features and starting price.</p><Link href="/guest/resort-menu" className="mt-6 inline-flex rounded-full bg-[#F2B84B] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-stone-950">Open full resort menu</Link></div></div></header>
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12"><div className="grid gap-5 md:grid-cols-2">{roomCards.map((room) => <RoomCard key={room.id} room={room} />)}</div><p className="mt-6 text-xs leading-relaxed text-white/35">Room prices shown are current draft Tule Resort prices. Replace them with your approved final price list before launch.</p></main>
    </div>
  );
}
