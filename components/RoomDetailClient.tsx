'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Heart,
  MapPin,
  Maximize2,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
  Wifi,
  X,
} from 'lucide-react';
import type { Room } from '@/data/rooms';
import { useRoomFavorite } from '@/lib/roomFavorites';

type RoomDetailTab = 'overview' | 'specifications' | 'facilities' | 'policies';

export default function RoomDetailClient({
  room,
  roomsHref,
  bookHref,
  isBookedForDates,
  staySummary,
}: {
  room: Room;
  roomsHref: string;
  bookHref: string;
  isBookedForDates: boolean;
  staySummary: string | null;
}) {
  const { isFavorite, toggle } = useRoomFavorite(room.id);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RoomDetailTab>('overview');
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const lightboxTitleId = useId();
  const tabBaseId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const galleryPhotos = Array.from(
    new Set([room.imageUrl, ...(room.images ?? [])].filter((src): src is string => Boolean(src && src.trim()))),
  );
  const safePhotoIndex = activePhotoIndex < galleryPhotos.length ? activePhotoIndex : 0;
  const activePhotoUrl = galleryPhotos[safePhotoIndex] ?? room.imageUrl;

  const maxGuests = Number(room.maxOccupancy ?? room.capacity ?? 2);
  const price = Number(room.price ?? 0);
  const roomAmenities =
    Array.isArray(room.amenities) && room.amenities.length > 0
      ? room.amenities
      : ['High-Speed Wi-Fi', 'Lake Hawassa Pool Access', 'Daily Breakfast', 'Private Terrace'];

  const amenityIcons = [
    { label: 'Free WiFi', icon: Wifi },
    { label: 'Lake Pool', icon: Waves },
    { label: 'Spa Wellness', icon: Sparkles },
    { label: 'Free Parking', icon: Car },
    { label: 'Fitness Gym', icon: Dumbbell },
  ];

  const movePhoto = useCallback(
    (delta: number) => {
      if (galleryPhotos.length <= 1) return;
      setActivePhotoIndex((prev) => (prev + delta + galleryPhotos.length) % galleryPhotos.length);
    },
    [galleryPhotos.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        movePhoto(-1);
      } else if (e.key === 'ArrowRight') {
        movePhoto(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      prevFocused?.focus();
    };
  }, [lightboxOpen, movePhoto]);

  useEffect(() => {
    if (!shareStatus) return;
    const timer = setTimeout(() => setShareStatus(null), 2600);
    return () => clearTimeout(timer);
  }, [shareStatus]);

  async function handleShare() {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: `${room.name} | Tule Resort Hawassa`,
          text: room.description,
          url: shareUrl,
        });
        setShareStatus('Shared');
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('Link copied');
        return;
      }
      setShareStatus('Copy URL from address bar');
    } catch {
      // User dismissed native share sheet or clipboard permission denied
      setShareStatus('Share cancelled');
    }
  }

  const tabs: { id: RoomDetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'facilities', label: 'Facilities & Perks' },
    { id: 'policies', label: 'Booking Policy' },
  ];

  const availableForStay = (room.isAvailable ?? true) && !isBookedForDates;

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#26312D] pb-32">
      {/* ─── TOP IMAGE HERO ─── */}
      <div className="relative w-full h-80 sm:h-96 md:h-[480px] bg-[#163D32] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhotoUrl}
          alt={room.name}
          className="w-full h-full object-cover object-center transition-opacity duration-300"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#163D32]/85 via-transparent to-black/30 pointer-events-none" />

        {/* Top Navigation Icons */}
        <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 flex items-center justify-between z-20">
          <Link
            href={roomsHref}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white/95 backdrop-blur-md text-[#163D32] shadow-md hover:bg-white transition-all"
            aria-label="Back to rooms"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2">
            {shareStatus && (
              <span
                role="status"
                className="inline-flex items-center gap-1 rounded-full bg-[#163D32]/90 border border-[#C5A46D]/40 px-3 py-1.5 text-[11px] font-bold text-[#F5F0E6] shadow-md"
              >
                <Check className="h-3.5 w-3.5 text-[#C5A46D]" /> {shareStatus}
              </span>
            )}
            <button
              type="button"
              onClick={toggle}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Remove ${room.name} from favorites` : `Save ${room.name} to favorites`}
              title={isFavorite ? 'Saved to favorites' : 'Save to favorites'}
              className={`flex items-center justify-center h-10 w-10 rounded-full backdrop-blur-md shadow-md transition-all cursor-pointer ${
                isFavorite
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-white/95 text-[#26312D] hover:bg-white hover:text-[#7A5A27]'
              }`}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-white/95 backdrop-blur-md text-[#26312D] shadow-md hover:bg-white hover:text-[#163D32] transition-all cursor-pointer"
              aria-label={`Share ${room.name}`}
              title="Share suite"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel Controls & Photo Count */}
        <div className="absolute bottom-12 sm:bottom-14 inset-x-4 sm:inset-x-6 flex items-center justify-between z-20 pointer-events-none">
          {galleryPhotos.length > 1 ? (
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => movePhoto(-1)}
                aria-label="Previous suite photo"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#163D32]/85 text-[#F5F0E6] border border-[#C5A46D]/30 hover:bg-[#C5A46D] hover:text-[#163D32] transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => movePhoto(1)}
                aria-label="Next suite photo"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#163D32]/85 text-[#F5F0E6] border border-[#C5A46D]/30 hover:bg-[#C5A46D] hover:text-[#163D32] transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Open photo gallery lightbox"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[#163D32]/90 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-bold text-[#F5F0E6] border border-[#C5A46D]/35 hover:bg-[#163D32] transition cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5 text-[#C5A46D]" />
            {galleryPhotos.length > 1
              ? `${safePhotoIndex + 1} / ${galleryPhotos.length} Photos`
              : 'View Photo'}
          </button>
        </div>
      </div>

      {/* ─── ROOM DETAILS BODY ─── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-30">
        <div className="rounded-[2.2rem] bg-white p-6 sm:p-9 shadow-xl border border-[#163D32]/10 space-y-6">
          {/* Header Title & Real Specs */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#163D32]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-[#163D32]">
                {room.view || 'Lake Hawassa Sanctuary'}
              </span>
              {!availableForStay ? (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-rose-800">
                  {isBookedForDates ? 'Booked For Selected Dates' : 'Currently Unavailable'}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-emerald-800">
                  Available Direct
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#26312D] tracking-tight">
              {room.name}
            </h1>
            {room.nameAm && (
              <p className="text-sm font-semibold text-[#7A5A27]">{room.nameAm}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5 text-[#7A5A27] font-bold">
                <BedDouble className="h-4 w-4 shrink-0" />
                <span className="text-[#26312D]">{room.type || 'Resort Suite'}</span>
              </div>
              <span className="text-[#52645D]" aria-hidden="true">•</span>
              <p className="text-[#52645D] flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-[#7A5A27]" />
                Hawassa, Sidama • Lake Shorefront
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

          {/* ─── WORKING TABS ROW ─── */}
          <div
            role="tablist"
            aria-label="Suite details sections"
            className="flex items-center gap-5 sm:gap-6 border-b border-[#163D32]/10 text-xs font-bold overflow-x-auto scrollbar-none"
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`${tabBaseId}-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${tabBaseId}-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 whitespace-nowrap transition-colors cursor-pointer ${
                    selected
                      ? 'text-[#163D32] border-b-2 border-[#163D32] font-black'
                      : 'text-[#52645D] hover:text-[#163D32]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ─── ACTIVE TAB PANEL ─── */}
          {activeTab === 'overview' && (
            <div
              id={`${tabBaseId}-panel-overview`}
              role="tabpanel"
              aria-labelledby={`${tabBaseId}-tab-overview`}
              className="space-y-4"
            >
              <div className="space-y-2">
                <h2 className="font-display text-xl font-medium text-[#26312D]">About This Suite</h2>
                <p className="text-xs sm:text-sm text-[#26312D]/85 leading-relaxed font-normal">
                  {room.description ||
                    'Experience premier lakeside luxury at Tule Resort. Featuring tranquil views, restful bedding, rain shower amenities, and access to Lake Hawassa leisure facilities.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div
              id={`${tabBaseId}-panel-specifications`}
              role="tabpanel"
              aria-labelledby={`${tabBaseId}-tab-specifications`}
              className="space-y-3"
            >
              <h2 className="font-display text-xl font-medium text-[#26312D]">Room Specifications</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-[#F5F0E6] p-4 border border-[#163D32]/8 flex items-center gap-3">
                  <BedDouble className="h-5 w-5 text-[#163D32] shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#52645D]">Bedding Configuration</p>
                    <p className="font-black text-[#26312D]">{room.bedType || '1 King Bed'}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F5F0E6] p-4 border border-[#163D32]/8 flex items-center gap-3">
                  <Maximize2 className="h-5 w-5 text-[#163D32] shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#52645D]">Floor Area</p>
                    <p className="font-black text-[#26312D]">{room.sizeSqm ? `${room.sizeSqm} m²` : 'Generous Suite Layout'}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F5F0E6] p-4 border border-[#163D32]/8 flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#163D32] shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#52645D]">Guest Capacity</p>
                    <p className="font-black text-[#26312D]">Up to {maxGuests} Guest{maxGuests === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F5F0E6] p-4 border border-[#163D32]/8 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-[#163D32] shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#52645D]">Exposure &amp; View</p>
                    <p className="font-black text-[#26312D]">{room.view || 'Lake Hawassa Sanctuary'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'facilities' && (
            <div
              id={`${tabBaseId}-panel-facilities`}
              role="tabpanel"
              aria-labelledby={`${tabBaseId}-tab-facilities`}
              className="space-y-3"
            >
              <h2 className="font-display text-xl font-medium text-[#26312D]">Included Amenities &amp; Perks</h2>
              <ul className="grid sm:grid-cols-2 gap-2.5 text-xs">
                {roomAmenities.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-xl bg-[#F5F0E6] px-3.5 py-2.5 font-semibold text-[#26312D] border border-[#163D32]/8"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#163D32] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'policies' && (
            <div
              id={`${tabBaseId}-panel-policies`}
              role="tabpanel"
              aria-labelledby={`${tabBaseId}-tab-policies`}
              className="space-y-3"
            >
              <h2 className="font-display text-xl font-medium text-[#26312D]">Check-In &amp; Reservation Policy</h2>
              <ul className="space-y-2 text-xs text-[#26312D]/85 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#163D32] shrink-0 mt-0.5" />
                  <span>Check-in begins at 14:00 EAT; check-out is at 11:00 EAT (subject to front desk availability for late requests).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#163D32] shrink-0 mt-0.5" />
                  <span>Direct reservations include complimentary breakfast at our lakeside restaurant and access to the resort pool.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#163D32] shrink-0 mt-0.5" />
                  <span>Reserve online with Telebirr, CBE Birr, bank transfer, or choose Pay at Resort. Track or cancel bookings via My Activity.</span>
                </li>
              </ul>
            </div>
          )}

          {/* ─── SPECIFICATIONS MINI-GRID ─── */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F5F0E6] border border-[#163D32]/8 text-center">
            <div>
              <p className="text-[10px] font-bold text-[#52645D] uppercase">Bed Type</p>
              <p className="text-xs font-black text-[#26312D] mt-0.5">{room.bedType || '1 King Bed'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#52645D] uppercase">Room Size</p>
              <p className="text-xs font-black text-[#26312D] mt-0.5">{room.sizeSqm || 42} m²</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#52645D] uppercase">Occupancy</p>
              <p className="text-xs font-black text-[#26312D] mt-0.5">Max {maxGuests} Guests</p>
            </div>
          </div>

          {/* ─── REAL PHOTO GALLERY THUMBNAILS ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-[#26312D] uppercase tracking-wider">
                Suite Photography ({galleryPhotos.length})
              </h2>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="text-xs font-bold text-[#7A5A27] hover:underline cursor-pointer"
              >
                Expand View
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {galleryPhotos.map((img, i) => {
                const active = i === safePhotoIndex;
                return (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => {
                      setActivePhotoIndex(i);
                      if (galleryPhotos.length === 1) setLightboxOpen(true);
                    }}
                    aria-label={`Select photo ${i + 1} of ${galleryPhotos.length} for ${room.name}`}
                    aria-pressed={active}
                    className={`h-20 sm:h-24 rounded-2xl bg-[#F5F0E6] relative overflow-hidden group shadow-xs cursor-pointer transition border-2 ${
                      active ? 'border-[#163D32] ring-2 ring-[#C5A46D]/60' : 'border-transparent hover:border-[#C5A46D]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`${room.name} thumbnail ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── RESORT GUARANTEED RESERVATION POLICY ─── */}
          <div className="rounded-2xl bg-[#F5F0E6] p-4 border border-[#163D32]/10 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#163D32] text-[#C5A46D] flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-[#163D32]">Resort Direct Guarantee</p>
              <p className="text-[11px] text-[#26312D]/80 mt-0.5">
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
              <span className="text-xs font-bold text-[#7A5A27]">ETB</span>
              <span className="text-xs text-[#52645D] font-semibold">/ night</span>
            </div>
            <p className="text-[10px] text-[#52645D] font-medium">
              {staySummary ?? 'Complimentary breakfast & lake access included'}
            </p>
            {isBookedForDates && (
              <p className="text-[10px] font-bold text-rose-700 mt-0.5">
                Unavailable for selected dates — choose other dates on the next step
              </p>
            )}
          </div>

          <Link
            href={bookHref}
            className="rounded-full bg-[#163D32] hover:bg-[#C5A46D] hover:text-[#163D32] px-7 py-3.5 text-xs font-black uppercase tracking-wider text-[#F5F0E6] shadow-lg transition-all flex items-center gap-2 shrink-0"
          >
            Select Room <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ─── FULLSCREEN PHOTO LIGHTBOX ─── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1E19]/95 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby={lightboxTitleId}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-5 top-5 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer"
            aria-label="Close photo lightbox"
          >
            <X className="h-5 w-5" />
          </button>

          {galleryPhotos.length > 1 && (
            <button
              type="button"
              onClick={() => movePhoto(-1)}
              className="hidden sm:flex absolute left-4 rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div className="max-h-[90vh] max-w-5xl w-full flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhotoUrl}
              alt={`${room.name} gallery view ${safePhotoIndex + 1}`}
              className="max-h-[72vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="mt-4 w-full max-w-3xl flex items-center justify-between gap-4 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C5A46D]">
                  {room.view || 'Tule Resort'} · {safePhotoIndex + 1} / {galleryPhotos.length}
                </p>
                <p id={lightboxTitleId} className="font-display text-2xl font-medium text-[#F5F0E6]">
                  {room.name}
                </p>
              </div>
              {galleryPhotos.length > 1 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => movePhoto(-1)}
                    className="sm:hidden rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePhoto(1)}
                    className="rounded-full bg-white/15 p-3 text-white hover:bg-white/25 transition cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

