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
    <div className="min-h-screen bg-[#F8FBFC] text-[#1E293B] pb-32">
      {/* ─── TOP IMAGE CAROUSEL CONTAINER (Image 2 Top) ─── */}
      <div className="relative w-full h-80 sm:h-96 md:h-[460px] bg-[#073B4C] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={room.imageUrl}
          alt={room.name}
          className="w-full h-full object-cover object-center"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Navigation Icons */}
        <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 flex items-center justify-between z-20">
          <Link
            href="/guest/rooms"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 backdrop-blur-md text-gray-800 shadow-md hover:bg-white transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 backdrop-blur-md text-gray-800 shadow-md hover:text-red-500 transition-all">
              <Heart className="h-5 w-5" />
            </button>
            <button className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 backdrop-blur-md text-gray-800 shadow-md hover:text-[#073B4C] transition-all">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel Page Counter Indicator (e.g. 1/8) */}
        <div className="absolute bottom-4 right-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white z-10">
          1/8 Photos
        </div>
      </div>

      {/* ─── ROOM DETAILS BODY ─── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-6 relative z-30">
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-gray-100 space-y-6">
          {/* Header Title & Rating */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {room.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-amber-500 font-black">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-gray-600 font-semibold text-xs">Resort Verified Guest Rating</span>
              </div>
              <span className="text-gray-300">•</span>
              <p className="text-gray-500 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#073B4C]" />
                Hawassa, Sidama • Lake Shorefront
              </p>
            </div>
          </div>

          {/* ─── 5 AMENITY TILES (Image 2 Tiles Row) ─── */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 py-2 border-y border-gray-100">
            {amenityIcons.map((am) => {
              const Icon = am.icon;
              return (
                <div
                  key={am.label}
                  className="rounded-2xl bg-[#F8F9FA] p-3 text-center flex flex-col items-center gap-1.5 border border-gray-100 shadow-2xs hover:border-orange-200 transition-all"
                >
                  <Icon className="h-5 w-5 text-[#073B4C]" />
                  <span className="text-[10px] font-extrabold text-gray-700 truncate max-w-full">
                    {am.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ─── TABS ROW (Overview | Rooms | Facilities | Reviews) ─── */}
          <div className="flex items-center gap-6 border-b border-gray-100 text-xs font-bold text-gray-400 overflow-x-auto scrollbar-none">
            <button className="pb-3 text-[#073B4C] border-b-2 border-[#073B4C] font-black">
              Overview
            </button>
            <button className="pb-3 hover:text-gray-700">Specifications</button>
            <button className="pb-3 hover:text-gray-700">Facilities</button>
            <button className="pb-3 hover:text-gray-700">Guest Reviews</button>
          </div>

          {/* ─── ABOUT THIS ROOM ─── */}
          <div className="space-y-2">
            <h3 className="text-sm font-black text-gray-900">About This Room</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {room.description ||
                'Experience premier lakeside luxury at Tule Resort. Featuring panoramic floor-to-ceiling windows, king-sized plush bedding, marble rain shower, and a private lake-facing balcony where morning mist and sunset over Lake Hawassa meet.'}
            </p>
          </div>

          {/* ─── SPECIFICATIONS MINI-GRID ─── */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#F8F9FA] border border-gray-100 text-center">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Bed Type</p>
              <p className="text-xs font-black text-gray-900 mt-0.5">{room.bedType || '1 King Bed'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Room Size</p>
              <p className="text-xs font-black text-gray-900 mt-0.5">{room.sizeSqm || 42} m²</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Occupancy</p>
              <p className="text-xs font-black text-gray-900 mt-0.5">Max {maxGuests} Guests</p>
            </div>
          </div>

          {/* ─── PHOTO GALLERY THUMBNAILS (Image 2 Gallery Row) ─── */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Photo Gallery
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {galleryThumbs.map((img, i) => (
                <div
                  key={i}
                  className="h-20 sm:h-24 rounded-2xl bg-gray-100 bg-cover bg-center border border-gray-200 relative overflow-hidden group shadow-xs"
                  style={{ backgroundImage: `url(${img})` }}
                >
                  {i === 2 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-black text-xs">
                      +5 More
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── RESORT GUARANTEED RESERVATION POLICY ─── */}
          <div className="rounded-2xl bg-teal-50/70 p-4 border border-teal-100 flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-teal-100 text-[#073B4C] flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-[#073B4C]">Resort Direct Guarantee</p>
              <p className="text-[11px] text-teal-800/80 mt-0.5">
                Pay upon arrival at the resort. Pending reservations can be cancelled or modified online via My Activity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STICKY BOTTOM BAR (Image 2 Bottom Floating Bar) ─── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 p-4 shadow-2xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-gray-900">
                {price.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#FF6B00]">ETB</span>
              <span className="text-xs text-gray-400 font-semibold">/ night</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">
              Tax and complimentary breakfast included
            </p>
          </div>

          <Link
            href={`/guest/rooms/${encodeURIComponent(room.slug || room.id)}/book`}
            className="rounded-2xl bg-gradient-to-r from-[#073B4C] via-[#0B4F6C] to-[#073B4C] hover:from-[#FF6B00] hover:to-[#E85D04] px-6 sm:px-8 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-teal-900/20 hover:shadow-orange-500/20 transition-all flex items-center gap-2"
          >
            Select Room <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
