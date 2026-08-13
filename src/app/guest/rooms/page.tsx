import Link from 'next/link';
import { ArrowLeft, BedDouble } from 'lucide-react';
import RoomCard, { type RoomCardData } from '@/components/RoomCard';
import { RESORT_SERVICES } from '@/data/resort-services';

const accommodationImage = RESORT_SERVICES.find((service) => service.id === 'rooms')?.imageUrl ?? '';

const ROOMS: RoomCardData[] = [
  { id: 'twin', name: 'Twin Room', description: 'Comfortable twin accommodation with a garden-view profile and resort amenities.', area: '35 m²', view: 'Garden view', bed: 'Twin', imageUrl: accommodationImage, features: ['Wi-Fi', 'Private balcony', 'Swimming pool', '24hr room service'] },
  { id: 'suite', name: 'Suite Room', description: 'A more spacious stay for guests looking for extra comfort and a premium room experience.', area: 'Suite', view: 'Resort view', bed: 'Suite', imageUrl: accommodationImage, features: ['Wi-Fi', 'Room service', 'Private balcony', 'Modern amenities'] },
  { id: 'family', name: 'Family Room', description: 'A family-focused option designed for guests travelling together.', area: 'Family', view: 'Resort view', bed: 'Family setup', imageUrl: accommodationImage, features: ['Family friendly', 'Wi-Fi', 'Swimming pool', 'Children playground'] },
  { id: 'presidential', name: 'Presidential Suite', description: 'A premium suite category for an elevated Haile stay experience.', area: 'Premium', view: 'Resort view', bed: 'Presidential', imageUrl: accommodationImage, features: ['Premium stay', 'Wi-Fi', 'Room service', 'Resort amenities'] },
];

export default function RoomsPage() {
  return (
    <div className="min-h-screen bg-[#0C0B09] text-white pb-16">
      <header className="border-b border-white/10 bg-[#17120D]"><div className="mx-auto max-w-7xl px-4 md:px-6 py-5"><Link href="/guest" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" />Guest services</Link><div className="mt-10 pb-8"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#F2B84B]"><BedDouble className="h-4 w-4" />Accommodation</div><h1 className="mt-3 text-5xl md:text-7xl font-black tracking-[-.06em]">STAY YOUR WAY.</h1><p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-white/55">Explore room categories and compare the essentials before moving to the official Haile booking flow.</p></div></div></header>
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12"><div className="grid gap-5 md:grid-cols-2">{ROOMS.map((room) => <RoomCard key={room.id} room={room} />)}</div><p className="mt-6 text-xs leading-relaxed text-white/35">Room prices and live availability are intentionally not shown here until a verified booking/availability source is connected.</p></main>
    </div>
  );
}
