import Link from 'next/link';
import { BedDouble, Check, Compass, Maximize2, Users, ArrowRight, Sparkles, MapPin } from 'lucide-react';

export interface RoomCardData {
  id: string;
  slug?: string;
  name: string;
  nameAm?: string;
  type?: string;
  view?: string;
  bedType?: string;
  sizeSqm?: number;
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
  const bookingTarget = room.slug ? `/guest/rooms/${encodeURIComponent(room.slug)}/book` : '/guest/rooms';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#C5A059]/25 bg-gradient-to-b from-[#121924] via-[#0E1520] to-[#0A0F16] text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[#D4AF37]/60 hover:shadow-[0_28px_60px_rgba(212,175,55,0.15)]">
      {/* Top Image Container */}
      <div className="relative h-[280px] sm:h-[320px] w-full overflow-hidden bg-[#0A0E14]">
        <img
          src={room.imageUrl}
          alt={room.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Ambient Dark-to-Transparent Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1520] via-[#0E1520]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges Bar */}
        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2 z-10">
          {/* View Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A059]/40 bg-[#0A0E14]/85 px-3 py-1.5 text-[11px] font-bold text-[#F5E2B3] backdrop-blur-md shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            <Compass className="h-3 w-3 text-[#D4AF37]" />
            {room.view || room.type}
          </span>

          {/* Gold Bookmark Ribbon */}
          <div className="relative flex flex-col items-end">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#F5E2B3]/30 bg-gradient-to-r from-[#DFB76C] via-[#C5A059] to-[#A88239] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#0B0F15] shadow-lg">
              <Sparkles className="h-3 w-3 fill-[#0B0F15]" />
              <span>{available ? 'Available' : 'Reserved'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Image Overlay: Amharic Name & Room Title */}
        <div className="absolute bottom-4 left-5 right-5 z-10">
          {room.nameAm && (
            <p className="text-[12px] font-medium text-[#DFB76C] tracking-wide drop-shadow-sm font-serif">
              {room.nameAm}
            </p>
          )}
          <h3 className="mt-0.5 text-2xl font-black tracking-tight text-white drop-shadow-md sm:text-3xl font-serif">
            {room.name}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
        <div>
          {/* Description */}
          <p className="text-xs sm:text-sm leading-relaxed text-slate-300 line-clamp-3">
            {room.description}
          </p>

          {/* Room Specifications Strip (Bed, Size, Guests) */}
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[#C5A059]/20 bg-[#16202E]/60 p-3 text-center">
            {room.bedType && (
              <div className="flex flex-col items-center justify-center border-r border-[#C5A059]/15 pr-2">
                <BedDouble className="h-4 w-4 text-[#D4AF37]" />
                <span className="mt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bed</span>
                <span className="text-[11px] font-bold text-slate-200 line-clamp-1">{room.bedType}</span>
              </div>
            )}
            {room.sizeSqm && (
              <div className="flex flex-col items-center justify-center border-r border-[#C5A059]/15 px-2">
                <Maximize2 className="h-4 w-4 text-[#D4AF37]" />
                <span className="mt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Size</span>
                <span className="text-[11px] font-bold text-slate-200">{room.sizeSqm} m²</span>
              </div>
            )}
            <div className="flex flex-col items-center justify-center pl-2">
              <Users className="h-4 w-4 text-[#D4AF37]" />
              <span className="mt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Guests</span>
              <span className="text-[11px] font-bold text-slate-200">Up to {room.maxOccupancy ?? room.capacity}</span>
            </div>
          </div>

          {/* Top Amenities with Gold Checkmarks */}
          {amenities.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C5A059]">Room Highlights</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {amenities.slice(0, 5).map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 rounded-full border border-[#C5A059]/20 bg-[#16202E]/40 px-2.5 py-1 text-[10px] font-medium text-slate-300"
                  >
                    <Check className="h-3 w-3 text-[#D4AF37] stroke-[3]" />
                    {amenity}
                  </span>
                ))}
                {amenities.length > 5 && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 font-medium">
                    +{amenities.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Pricing & Poster CTA */}
        <div className="mt-6 border-t border-[#C5A059]/20 pt-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nightly Rate</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#F5E2B3] font-serif">
                  {room.price.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#DFB76C]">ETB</span>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Inclusive of Breakfast & Tax</span>
          </div>

          {/* Book Now Button Inspired by Poster Ribbon Tag */}
          <Link
            href={bookingTarget}
            aria-disabled={!available}
            className={`group/btn block w-full rounded-2xl transition-all duration-300 ${
              available
                ? 'bg-gradient-to-r from-[#DFB76C] via-[#C5A059] to-[#A88239] p-0.5 hover:shadow-[0_8px_25px_rgba(212,175,55,0.35)] hover:scale-[1.01]'
                : 'cursor-not-allowed opacity-50 bg-slate-700 p-0.5'
            }`}
          >
            <div className="flex items-center justify-between rounded-[14px] bg-gradient-to-r from-[#DFB76C] via-[#C5A059] to-[#B38E33] px-4 py-3 text-[#0A0F16]">
              <div>
                <span className="text-xs font-black uppercase tracking-[.18em] leading-none block">
                  {available ? 'BOOK NOW' : 'UNAVAILABLE'}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#0A0F16]/75 mt-0.5 block">
                  {available ? 'FOR THE BEST RESORT EXPERIENCE' : 'CHECK OTHER DATES'}
                </span>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A0F16] text-[#F5E2B3] transition-transform duration-300 group-hover/btn:translate-x-1">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </article>
  );
}
