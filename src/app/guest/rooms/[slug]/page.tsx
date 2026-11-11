import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRoomBySlug } from '@/lib/rooms';
import supabaseServer from '@/lib/supabaseServer';
import {
  buildRoomExploreSearchQuery,
  buildStaySearchQuery,
  parseRoomExploreFilters,
} from '@/lib/bookingParams';
import RoomDetailClient from '@/components/RoomDetailClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlug(decodeURIComponent(slug));

  if (!room) {
    return {
      title: 'Suite Not Found',
      description: 'Requested room or suite could not be found at Tule Resort.',
    };
  }

  return {
    title: room.name,
    description: room.description,
    openGraph: {
      title: `${room.name} | Tule Resort Hawassa`,
      description: room.description,
      images: room.imageUrl ? [{ url: room.imageUrl, alt: room.name }] : undefined,
    },
  };
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ slug }, rawSearch] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const decodedSlug = decodeURIComponent(slug);
  const filters = parseRoomExploreFilters(rawSearch);
  const room = await getRoomBySlug(decodedSlug);

  if (!room) {
    notFound();
  }

  let isBookedForDates = false;
  if (filters.checkIn && filters.checkOut) {
    try {
      const { data: conflicts } = await supabaseServer
        .from('room_reservations')
        .select('id')
        .eq('room_id', room.id)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .lt('check_in', filters.checkOut)
        .gt('check_out', filters.checkIn)
        .limit(1);
      if (Array.isArray(conflicts) && conflicts.length > 0) {
        isBookedForDates = true;
      }
    } catch {
      // Fail open on read-only detail hint; RPC still enforces strict locking on submit
    }
  }

  const maxGuests = Number(room.maxOccupancy ?? room.capacity ?? 2);
  const clampedGuests = filters.guests ? Math.min(Math.max(1, filters.guests), maxGuests) : undefined;
  const stayQuery = buildStaySearchQuery({
    checkIn: filters.checkIn,
    checkOut: filters.checkOut,
    guests: clampedGuests,
  });
  const backQuery = buildRoomExploreSearchQuery(filters);
  const roomsHref = backQuery ? `/guest/rooms?${backQuery}` : '/guest/rooms';
  const bookHref = `/guest/rooms/${encodeURIComponent(room.slug || room.id)}/book${stayQuery ? `?${stayQuery}` : ''}`;
  const staySummary =
    filters.checkIn && filters.checkOut
      ? `${filters.checkIn} → ${filters.checkOut}${clampedGuests ? ` · ${clampedGuests} guest${clampedGuests > 1 ? 's' : ''}` : ''}`
      : null;

  return (
    <RoomDetailClient
      room={room}
      roomsHref={roomsHref}
      bookHref={bookHref}
      isBookedForDates={isBookedForDates}
      staySummary={staySummary}
    />
  );
}
