import RoomsExploreClient from '@/components/RoomsExploreClient';
import { getRooms } from '@/lib/rooms';
import supabaseServer from '@/lib/supabaseServer';
import { parseRoomExploreFilters } from '@/lib/bookingParams';
import type { RoomCardData } from '@/components/RoomCard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Luxury Rooms & Suites | Tule Resort Hawassa',
  description: 'Experience premier lakefront accommodation at Tule Resort on Lake Hawassa. Modern rooms, luxury suites, and panoramic views.',
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearch = await searchParams;
  const initialFilters = parseRoomExploreFilters(resolvedSearch);

  const rooms = await getRooms();
  const bookedRoomIds = new Set<string>();

  if (initialFilters.checkIn && initialFilters.checkOut) {
    try {
      const { data: conflicts, error } = await supabaseServer
        .from('room_reservations')
        .select('room_id')
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .lt('check_in', initialFilters.checkOut)
        .gt('check_out', initialFilters.checkIn);

      if (!error && Array.isArray(conflicts)) {
        for (const row of conflicts) {
          if (typeof row?.room_id === 'string' && row.room_id) {
            bookedRoomIds.add(row.room_id);
          }
        }
      }
    } catch {
      // Preserve room list gracefully if availability check cannot reach DB
    }
  }

  const roomCards: RoomCardData[] = rooms.map((room) => ({
    id: room.slug || room.id,
    slug: room.slug || room.id,
    name: room.name,
    nameAm: room.nameAm,
    type: room.type,
    view: room.view,
    bedType: room.bedType,
    sizeSqm: room.sizeSqm,
    description: room.description,
    price: room.price,
    capacity: room.capacity ?? room.maxOccupancy ?? 2,
    maxOccupancy: room.maxOccupancy ?? room.capacity ?? 2,
    imageUrl: room.imageUrl,
    amenities: room.amenities?.length ? room.amenities : ['Free High-Speed Wi-Fi', 'Complimentary Buffet Breakfast', 'Pool & Gym Access'],
    isAvailable: (room.isAvailable ?? true) && !bookedRoomIds.has(room.id),
  }));

  return <RoomsExploreClient initialRooms={roomCards} initialFilters={initialFilters} />;
}
