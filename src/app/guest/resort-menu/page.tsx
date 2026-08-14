import Link from 'next/link';
import { getResortServices } from '@/lib/resortServices';
import { getRooms } from '@/lib/rooms';
import ResortExperienceMenu, { type ExperienceItem } from '@/components/ResortExperienceMenu';
import type { ResortService } from '@/data/resort-services';
import type { Room } from '@/data/rooms';

const servicePresentation: Record<string, Omit<ExperienceItem, 'id' | 'name' | 'description' | 'imageUrl' | 'features'>> = {
  restaurant: { amharicName: 'ሬስቶራንት እና ባር', category: 'DINING', price: 500, unit: 'starting / guest', accent: '#F2B84B', href: '/guest/restaurant', actionLabel: 'Explore dining' },
  spa: { amharicName: 'ስፓ እና የውበት እንክብካቤ', category: 'WELLNESS', price: 800, unit: 'starting / session', accent: '#C9828E', href: '/guest/spa/request', actionLabel: 'Book wellness' },
  'gym-membership': { amharicName: 'ጂም እና የአካል ብቃት', category: 'WELLNESS', price: 500, unit: 'day pass', accent: '#7DBA62', href: '/guest/gym-membership/request', actionLabel: 'Request access' },
  'pool-passes': { amharicName: 'የመዋኛ ገንዳ', category: 'LEISURE', price: 250, unit: 'day pass / guest', accent: '#5FA7C9', href: '/guest/pool-passes/request', actionLabel: 'Request pool' },
  'conference-room': { amharicName: 'የስብሰባ ክፍሎች', category: 'EVENTS', price: 3500, unit: 'starting / half day', accent: '#8D9CC8', href: '/guest/conference-room/request', actionLabel: 'Book space' },
  'multi-purpose-halls': { amharicName: 'ሁለገብ አዳራሾች', category: 'EVENTS', price: 15000, unit: 'starting / day', accent: '#E56B4D', href: '/guest/multi-purpose-halls/request', actionLabel: 'Book venue' },
  experiences: { amharicName: 'ልዩ የመዝናኛ ተሞክሮዎች', category: 'LEISURE', price: 1000, unit: 'starting / guest', accent: '#86A96B', href: '/guest/experiences/request', actionLabel: 'Request experience' },
};

const roomAmharic: Record<string, string> = {
  twin: 'መንታ አልጋ ክፍል',
  suite: 'ሱዊት ክፍል',
  family: 'የቤተሰብ ክፍል',
  presidential: 'ፕሬዚዳንታዊ ሱዊት',
};

function roomItem(room: Room): ExperienceItem {
  return {
    id: room.slug || room.id,
    name: room.name,
    amharicName: roomAmharic[room.slug] ?? 'የማረፊያ ክፍል',
    category: 'ROOMS',
    description: room.description,
    price: room.price,
    unit: 'per night',
    imageUrl: room.imageUrl,
    accent: '#F2B84B',
    features: [`Up to ${room.maxOccupancy || room.capacity} guests`, ...room.amenities.slice(0, 3)],
    href: '/guest/rooms',
    actionLabel: 'View room options',
  };
}

function serviceItem(service: ResortService): ExperienceItem | null {
  const presentation = servicePresentation[service.id];
  if (!presentation) return null;
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    imageUrl: service.imageUrl,
    features: service.features,
    ...presentation,
  };
}

export default async function ResortMenuPage() {
  const [rooms, services] = await Promise.all([getRooms(), getResortServices()]);
  const serviceItems = services.map(serviceItem).filter((item): item is ExperienceItem => Boolean(item));
  const items = [...rooms.map(roomItem), ...serviceItems];

  return (
    <>
      <ResortExperienceMenu items={items} />
      <div className="sr-only"><Link href="/guest">Tule Resort Guest Services</Link></div>
    </>
  );
}
