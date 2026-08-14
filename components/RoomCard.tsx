import Link from 'next/link';
import { BedDouble, CheckCircle2, Users } from 'lucide-react';

export interface RoomCardData {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  maxOccupancy?: number;
  imageUrl: string;
  amenities?: string[];
  isAvailable?: boolean;
}

export default function RoomCard({ room }: { room: RoomCardData }) {
  const available = room.isAvailable ?? true;
  const amenities = room.amenities ?? [];
  const bookingTarget = room.slug ? `/guest/rooms?room=${encodeURIComponent(room.slug)}` : '/guest/rooms';

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_55px_rgba(7,59,76,.10)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(7,59,76,.18)]">
      <div className="relative h-[360px] overflow-hidden">
        <img src={room.imageUrl} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#073B4C]/85 via-[#073B4C]/10 to-transparent" />
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
          <span className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] backdrop-blur-md ${available ? 'border-white/30 bg-white/95 text-[#0B4F6C]' : 'border-white/30 bg-[#F3E9D2]/95 text-[#073B4C]'}`}>
            {available ? 'Available' : 'Unavailable'}
          </span>
          <div className="rounded-2xl border border-white/60 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#0B4F6C]/60">From</p>
            <p className="text-2xl leading-none font-black text-[#073B4C]">{room.price.toLocaleString()} <span className="text-xs align-middle">ETB</span></p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#0B4F6C]/50">per night</p>
          </div>
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#F3E9D2]">Tule Resort · Hawassa</p>
          <h3 className="mt-1 text-3xl font-black tracking-[-.04em] text-white sm:text-4xl">{room.name}</h3>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-sm leading-7 text-slate-600">{room.description}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#F3E9D2]/55 p-3">
            <Users className="h-5 w-5 text-[#0B4F6C]" />
            <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-[#0B4F6C]/50">Guests</p>
            <p className="text-sm font-bold text-[#073B4C]">Up to {room.maxOccupancy ?? room.capacity}</p>
          </div>
          <div className="rounded-2xl bg-[#EAF4F7] p-3">
            <BedDouble className="h-5 w-5 text-[#0B4F6C]" />
            <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-[#0B4F6C]/50">Stay</p>
            <p className="text-sm font-bold text-[#073B4C]">Comfortable resort stay</p>
          </div>
        </div>
        {amenities.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#0B4F6C]/50">Room amenities</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {amenities.slice(0, 6).map((amenity) => (
                <span key={amenity} className="inline-flex items-center gap-1.5 rounded-full border border-[#0B4F6C]/10 bg-white px-3 py-1.5 text-[10px] font-bold text-[#073B4C]/75">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0B4F6C]" />
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
        <Link href={bookingTarget} aria-disabled={!available} className={`mt-6 block rounded-full px-5 py-3.5 text-center text-xs font-black uppercase tracking-[.14em] transition ${available ? 'bg-[#0B4F6C] text-white hover:bg-[#073B4C] hover:scale-[1.01]' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}>
          {available ? 'Book Now' : 'Currently Unavailable'}
        </Link>
      </div>
    </article>
  );
}
