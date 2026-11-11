import type { Metadata } from 'next';
import VisualResortMenu from '@/components/VisualResortMenu';
import { getLiveMenuItems } from '@/lib/menu';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cafeteria & Coffee Lounge Menu',
  description:
    'Browse artisan Ethiopian coffee, fresh pastries, and casual all-day dishes prepared fresh at Tule Resort Hawassa.',
};

export default async function CafeteriaMenuPage() {
  const { items, error } = await getLiveMenuItems();
  return <VisualResortMenu serviceName="Cafeteria" initialItems={items} initialError={error} />;
}
