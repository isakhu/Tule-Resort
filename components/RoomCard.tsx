import React from 'react';
import Link from 'next/link';
import {
  BedDouble,
  Compass,
  Maximize2,
  Users,
  ArrowRight,
  Sparkles,
  MapPin,
  Star,
  Heart,
  Wifi,
  Waves,
  Coffee
} from 'lucide-react';

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
  const amenities = room.amenities ?? ['Free WiFi', 'Lake Pool', 'Breakfast'];
  const slug = room.slug || room.id;
  const detailsTarget = `/guest/rooms/${encodeURIComponent(slug)}`;
  const bookTarget = `/guest/rooms/${encodeURIComponent(slug)}/book`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-white text-[#1E293B] shadow-sm hover:shadow-xl border border-gray-100 hover:border-orange-200 transition-all duration-300">
      {/* ─── TOP IMAGE WITH BEST SELLER & HEART (Screen 1 Card) ─── */}
      <div className="relative h-60 sm:h-64 w-full overflow-hidden bg-[#073B4C]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={room.imageUrl}
          alt={room.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Ambient Dark-to-Transparent Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

        {/* Best Seller / Feature Badge */}
        <div className="absolute left-4 top-4 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#073B4C]/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-white shadow-md">
            <Sparkles className="h-3 w-3 text-[#FF6B00]" />
            {room.view || 'Lakeside View'}
          </span>
        </div>

        {/* Favorite Heart Button */}
        <button
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-gray-700 shadow-md hover:bg-white hover:text-red-500 transition-all"
          title="Save to favorites"
        >
          <Heart className="h-4 w-4" />
        </button>

        {/* Amharic label */}
        {room.nameAm && (
          <div className="absolute bottom-3 left-4 z-10">
            <span className="rounded-md bg-black/40 backdrop-blur-xs px-2 py-0.5 text-[11px] font-serif font-bold text-[#FF6B00]">
              {room.nameAm}
            </span>
          </div>
        )}
      </div>

      {/* ─── CARD CONTENT BODY ─── */}
      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        <div>
          {/* Rating & Review Count */}
          <div className="flex items-center gap-1.5 text-amber-500 text-xs font-black">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-gray-900">5.0</span>
            <span className="text-gray-400 font-semibold">(2.4k reviews)</span>
          </div>

          {/* Room Title */}
          <h3 className="text-lg font-black text-gray-900 mt-1 group-hover:text-[#FF6B00] transition-colors truncate">
            {room.name}
          </h3>

          {/* Location */}
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
            <MapPin className="h-3.5 w-3.5 text-[#073B4C] shrink-0" />
            Hawassa, Sidama • Direct Lake Shorefront
          </p>

          {/* Amenity Pills Row (Image 1) */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenities.slice(0, 3).map((am) => (
              <span
                key={am}
                className="inline-flex items-center gap-1 rounded-full bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-extrabold text-gray-600 border border-gray-100"
              >
                {am}
              </span>
            ))}
          </div>
        </div>

        {/* ─── BOTTOM PRICE & VIEW DETAILS BUTTON (Image 1 Bottom) ─── */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-gray-900">
                {room.price.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#FF6B00]">ETB</span>
              <span className="text-[11px] text-gray-400">/ night</span>
            </div>
            <p className="text-[9px] text-gray-400 font-medium">Inclusive of breakfast & tax</p>
          </div>

          <Link
            href={detailsTarget}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#073B4C] hover:bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all group/btn"
          >
            <span>View Details</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
