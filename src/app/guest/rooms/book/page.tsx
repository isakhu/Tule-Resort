import { redirect } from 'next/navigation';
import {
  buildRoomExploreSearchQuery,
  buildStaySearchQuery,
  parseRoomExploreFilters,
  pickSearchParam,
} from '@/lib/bookingParams';

export const dynamic = 'force-dynamic';

export default async function RoomBookAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const roomSlug = pickSearchParam(resolved.room) ?? pickSearchParam(resolved.slug);
  const filters = parseRoomExploreFilters(resolved);

  if (roomSlug) {
    const stayQuery = buildStaySearchQuery({
      checkIn: filters.checkIn,
      checkOut: filters.checkOut,
      guests: filters.guests,
    });
    redirect(`/guest/rooms/${encodeURIComponent(roomSlug)}/book${stayQuery ? `?${stayQuery}` : ''}`);
  }

  const exploreQuery = buildRoomExploreSearchQuery(filters);
  redirect(`/guest/rooms${exploreQuery ? `?${exploreQuery}` : ''}`);
}

