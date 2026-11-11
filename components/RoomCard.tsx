'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BedDouble,
  Maximize2,
  Users,
  ArrowRight,
  Sparkles,
  MapPin,
  Heart,
} from 'lucide-react';
import { useRoomFavorite } from '@/lib/roomFavorites';
import { isOptimizableImageSrc } from '@/lib/imageSrc';

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

export default function RoomCard({
  room,
  stayQuery = '',
  hasSelectedDates = false,
}: {
  room: RoomCardData;
  stayQuery?: string;
  hasSelectedDates?: boolean;
}) {
  const { isFavorite, toggle } = useRoomFavorite(room.id);
  const available = room.isAvailable ?? true;
  const amenities = room.amenities ?? ['Free High-Speed Wi-Fi', 'Lakeside Pool', 'Buffet Breakfast'];
  const slug = room.slug || room.id;
  const qs = stayQuery ? `?${stayQuery}` : '';
  const detailsTarget = `/guest/rooms/${encodeURIComponent(slug)}${qs}`;
  const bookTarget = `/guest/rooms/${encodeURIComponent(slug)}/book${qs}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-white text-[#26312D] shadow-[0_12px_40px_rgba(22,61,50,0.06)] hover:shadow-[0_20px_50px_rgba(22,61,50,0.14)] border border-[#163D32]/10 hover:border-[#C5A46D]/60 transition-all duration-300">
      {/* ─── TOP IMAGE WITH BADGE & FAVORITE ─── */}
      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-[#163D32]">
        <Image
          src={room.imageUrl}
          alt={room.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={!isOptimizableImageSrc(room.imageUrl)}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Ambient Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#163D32]/80 via-transparent to-black/25 pointer-events-none" />

        {/* View / Availability Badge */}
        <div className="absolute left-4 top-4 right-14 z-10 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#163D32]/85 backdrop-blur-md px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#F5F0E6] border border-[#C5A46D]/30 shadow-md">
            <Sparkles className="h-3 w-3 text-[#C5A46D]" />
            {room.view || 'Lakeside View'}
          </span>
          {!available && (
            <span className="inline-flex items-center rounded-full bg-rose-950/90 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-200 border border-rose-400/30 shadow-md">
              {hasSelectedDates ? 'Booked For Dates' : 'Unavailable'}
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={toggle}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${room.name} from favorites` : `Save ${room.name} to favorites`}
          title={isFavorite ? 'Saved to favorites' : 'Save to favorites'}
          className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md shadow-md transition-all cursor-pointer ${
            isFavorite
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'bg-white/90 text-[#26312D] hover:bg-white hover:text-[#7A5A27]'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Amharic label */}
        {room.nameAm && (
          <div className="absolute bottom-3 left-4 z-10">
            <span className="rounded-md bg-[#163D32]/70 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-display font-medium text-[#C5A46D]">
              {room.nameAm}
            </span>
          </div>
        )}
      </div>

      {/* ─── CARD CONTENT BODY ─── */}
      <div className="flex flex-1 flex-col justify-between p-6 space-y-4">
        <div>
          {/* Room Classification */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A5A27]">
            <BedDouble className="h-3.5 w-3.5 shrink-0" />
            <span>{room.type || 'Resort Sanctuary'}</span>
            {room.bedType && <span className="text-[#52645D] font-medium">· {room.bedType}</span>}
          </div>

          {/* Room Title */}
          <h3 className="font-display text-2xl font-medium text-[#26312D] mt-1 group-hover:text-[#163D32] transition-colors truncate">
            {room.name}
          </h3>

          {/* Location */}
          <p className="text-xs text-[#52645D] flex items-center gap-1 mt-1 truncate">
            <MapPin className="h-3.5 w-3.5 text-[#7A5A27] shrink-0" />
            Lake Hawassa Shore, Sidama · Private Terrace
          </p>

          {/* Room Specs & Amenity Pills */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {room.sizeSqm && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5F0E6] px-2.5 py-1 text-[10px] font-bold text-[#26312D] border border-[#163D32]/8">
                <Maximize2 className="h-3 w-3 text-[#163D32]" />
                {room.sizeSqm} m²
              </span>
            )}
            {room.capacity && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5F0E6] px-2.5 py-1 text-[10px] font-bold text-[#26312D] border border-[#163D32]/8">
                <Users className="h-3 w-3 text-[#163D32]" />
                {room.capacity} Guests
              </span>
            )}
            {amenities.slice(0, 2).map((am) => (
              <span
                key={am}
                className="inline-flex items-center gap-1 rounded-lg bg-[#F5F0E6] px-2.5 py-1 text-[10px] font-bold text-[#26312D] border border-[#163D32]/8"
              >
                {am}
              </span>
            ))}
          </div>
        </div>

        {/* ─── BOTTOM PRICE & ACTIONS ─── */}
        <div className="pt-4 border-t border-[#163D32]/10 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold text-[#163D32]">
                {room.price.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#7A5A27]">ETB</span>
              <span className="text-[11px] text-[#52645D]">/ night</span>
            </div>
            <p className="text-[10px] text-[#52645D] font-medium">Inclusive of breakfast &amp; lake perks</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={detailsTarget}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#163D32]/20 bg-[#F5F0E6] hover:border-[#C5A46D] px-3.5 py-2.5 text-xs font-bold text-[#163D32] transition-all"
            >
              Details
            </Link>
            <Link
              href={bookTarget}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#F5F0E6] shadow-sm hover:shadow-md transition-all group/btn"
            >
              <span>{available ? 'Book' : 'View'}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
