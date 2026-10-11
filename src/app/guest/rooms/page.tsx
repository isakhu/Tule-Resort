import RoomsExploreClient from '@/components/RoomsExploreClient';
import { getRooms } from '@/lib/rooms';
import type { RoomCardData } from '@/components/RoomCard';

export const metadata = {
  title: 'Luxury Rooms & Suites | Tule Resort Hawassa',
  description: 'Experience premier lakefront accommodation at Tule Resort on Lake Hawassa. Modern rooms, luxury suites, and panoramic views.',
};

export default async function RoomsPage() {
  const rooms = await getRooms();

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
    isAvailable: room.isAvailable,
  }));

  return <RoomsExploreClient initialRooms={roomCards} />;
}
