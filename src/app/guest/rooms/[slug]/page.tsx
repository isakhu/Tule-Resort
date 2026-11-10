import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  MapPin,
  Wifi,
  Waves,
  Sparkles,
  Car,
  Dumbbell,
  ShieldCheck,
  BedDouble,
  Maximize2,
  Users,
  CheckCircle2,
  ArrowRight,
  Coffee
} from 'lucide-react';
import { getRoomBySlug } from '@/lib/rooms';

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const room = await getRoomBySlug(decodedSlug);

  if (!room) {
    notFound();
  }

  const maxGuests = Number(room.maxOccupancy ?? room.capacity ?? 2);
  const price = Number(room.price ?? 0);
  const currency = 'ETB';

  const amenityIcons = [
    { label: 'Free WiFi', icon: Wifi },
    { label: 'Lake Pool', icon: Waves },
    { label: 'Spa Wellness', icon: Sparkles },
    { label: 'Free Parking', icon: Car },
    { label: 'Fitness Gym', icon: Dumbbell },
  ];

  const galleryThumbs = [
    room.imageUrl,
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
  ];

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D] pb-32">
      {/* ─── TOP IMAGE HERO ─── */}
      <div className="relative w-full h-80 sm:h-96 md:h-[480px] bg-[#163D32] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={room.imageUrl}
          alt={room.name}
          className="w-full h-full object-cover object-center"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#163D32]/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top Navigation Icons */}
        <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 flex items-center justify-between z-20">
          <Link
            href="/guest/rooms"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 backdrop-blur-md text-[#163D32] shadow-md hover:bg-white transition-all"
            aria-label="Back to rooms"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 backdrop-blur-md text-[#26312D] shadow-md hover:text-[#C5A46D] transition-all"
              type="button"
              aria-label="Save to favorites"
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 backdrop-blur-md text-[#26312D] shadow-md hover:text-[#163D32] transition-all"
              type="button"
              aria-label="Share room"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel Page Counter Indicator */}
        <div className="absolute bottom-4 right-4 rounded-full bg-[#163D32]/85 backdrop-blur-md px-3.5 py-1 text-[11px] font-bold text-[#F5F0E6] border border-[#C5A46D]/30 z-10">
          1/8 Photos
        </div>
      </div>

      {/* ─── ROOM DETAILS BODY ─── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-30">
        <div className="rounded-[2.2rem] bg-white p-6 sm:p-9 shadow-xl border border-[#163D32]/10 space-y-6">
          {/* Header Title & Rating */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#163D32]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-[#163D32]">
                {room.view || 'Lake Hawassa Sanctuary'}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#26312D] tracking-tight">
              {room.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-[#C5A46D] font-black">
                <Star className="h-4 w-4 fill-[#C5A46D] text-[#C5A46D]" />
                <span className="text-[#26312D] font-bold">5.0</span>
                <span className="text-[#8A9B83] font-medium">(Verified Luxury Rating)</span>
              </div>
              <span className="text-[#8A9B83]/40">•</span>
              <p className="text-[#8A9B83] flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#C5A46D]" />
                Hawassa, Sidama • Direct Lake Shorefront
              </p>
            </div>
          </div>

          {/* ─── 5 AMENITY TILES ─── */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 py-3 border-y border-[#163D32]/10">
            {amenityIcons.map((am) => {
              const Icon = am.icon;
              return (
                <div
                  key={am.label}
                  className="rounded-2xl bg-[#F5F0E6] p-3 text-center flex flex-col items-center gap-1.5 border border-[#163D32]/8 transition-all hover:border-[#C5A46D]/60"
                >
                  <Icon className="h-5 w-5 text-[#163D32]" />
                  <span className="text-[10px] font-extrabold text-[#26312D] truncate max-w-full">
                    {am.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ─── TABS ROW ─── */}
          <div className="flex items-center gap-6 border-b border-[#163D32]/10 text-xs font-bold text-[#8A9B83] overflow-x-auto scrollbar-none">
            <button className="pb-3 text-[#163D32] border-b-2 border-[#163D32] font-black" type="button">
              Overview
            </button>
            <button className="pb-3 hover:text-[#163D32]" type="button">Specifications</button>
            <button className="pb-3 hover:text-[#163D32]" type="button">Facilities</button>
            <button className="pb-3 hover:text-[#163D32]" type="button">Guest Reviews</button>
          </div>

          {/* ─── ABOUT THIS ROOM ─── */}
          <div className="space-y-2">
            <h3 className="font-display text-xl font-medium text-[#26312D]">About This Room</h3>
            <p className="text-xs sm:text-sm text-[#26312D]/80 leading-relaxed font-normal">
              {room.description ||
                'Experience premier lakeside luxury at Tule Resort. Featuring panoramic floor-to-ceiling windows, king-sized plush bedding, marble rain shower, and a private lake-facing balcony where morning mist and sunset over Lake Hawassa meet.'}
            </p>
          </div>

          {/* ─── SPECIFICATIONS MINI-GRID ─── */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F5F0E6] border border-[#163D32]/8 text-center">
            <div>
              <p className="text-[10px] font-bold text-[#8A9B83] uppercase">Bed Type</p>
              <p className="text-xs font-black text-[#26312D] mt-0.5">{room.bedType || '1 King Bed'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#8A9B83] uppercase">Room Size</p>
              <p className="text-xs font-black text-[#26312D] mt-0.5">{room.sizeSqm || 42} m²</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#8A9B83] uppercase">Occupancy</p>
              <p className="text-xs font-black text-[#26312D] mt-0.5">Max {maxGuests} Guests</p>
            </div>
          </div>

          {/* ─── PHOTO GALLERY THUMBNAILS ─── */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-[#26312D] uppercase tracking-wider">
              Photo Gallery
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {galleryThumbs.map((img, i) => (
                <div
                  key={i}
                  className="h-20 sm:h-24 rounded-2xl bg-[#F5F0E6] bg-cover bg-center border border-[#163D32]/10 relative overflow-hidden group shadow-xs"
                  style={{ backgroundImage: `url(${img})` }}
                >
                  {i === 2 && (
                    <div className="absolute inset-0 bg-[#163D32]/70 flex items-center justify-center text-[#F5F0E6] font-black text-xs">
                      +5 More
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── RESORT GUARANTEED RESERVATION POLICY ─── */}
          <div className="rounded-2xl bg-[#F5F0E6] p-4 border border-[#163D32]/10 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-[#163D32]">Resort Direct Guarantee</p>
              <p className="text-[11px] text-[#26312D]/75 mt-0.5">
                Pay upon arrival or via verified digital transfer. Reservations can be cancelled or modified online via My Activity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STICKY BOTTOM BAR ─── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#163D32]/10 p-4 shadow-2xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl sm:text-3xl font-bold text-[#163D32]">
                {price.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#C5A46D]">ETB</span>
              <span className="text-xs text-[#8A9B83] font-semibold">/ night</span>
            </div>
            <p className="text-[10px] text-[#8A9B83] font-medium">
              Tax and complimentary breakfast included
            </p>
          </div>

          <Link
            href={`/guest/rooms/${encodeURIComponent(room.slug || room.id)}/book`}
            className="rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-7 py-3.5 text-xs font-black uppercase tracking-wider text-[#F5F0E6] shadow-lg transition-all flex items-center gap-2"
          >
            Select Room <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
